import type Phaser from "phaser";
import type { DamageNumberEvent, GameBridge } from "../../GameBridge";
import { createActorSprite } from "../PhaserActorRenderer";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { ActorSystem } from "../systems/ActorSystem";
import { CombatPresentationSystem } from "../systems/CombatPresentationSystem";
import { DamageNumberSystem } from "../systems/DamageNumberSystem";
import { EnemyPresentationSystem } from "../systems/EnemyPresentationSystem";
import { HeroPresentationSystem } from "../systems/HeroPresentationSystem";
import { ProjectileSystem } from "../systems/ProjectileSystem";
import { VfxSystem, type EnemyVfxStyle } from "../systems/VfxSystem";
import { WorldHudSystem } from "../systems/WorldHudSystem";
import {
  applyPresentedEnemyImpact,
  clearPresentedEnemyHealth,
  getPresentedEnemyHealth,
  isPresentedEnemyDefeated,
  resetPresentedEnemyHealth,
} from "./CombatPresentedHealth";
import { PresentationDirector } from "./PresentationDirector";
import { selectWeaponPresentation } from "./GamePresentationState";

type PresentationDamageEvent = DamageNumberEvent & {
  readonly sourceType?: "auto_attack" | "ability" | "effect" | "other";
  readonly targetHealthAfter?: number;
};

const DEFEATED_ENEMY_HOLD_MS = 120;

/** Coordinates actors, combat events and in-world combat HUD. */
export class CombatPresentationController {
  public readonly playerBody: Phaser.GameObjects.Container;
  public readonly enemyBody: Phaser.GameObjects.Container;
  public readonly playerHomeX: number;
  public readonly enemyHomeX: number;
  public readonly entityY: number;

  private readonly actorSystem: ActorSystem;
  private readonly heroSystem: HeroPresentationSystem;
  private readonly enemySystem: EnemyPresentationSystem;
  private readonly hudSystem: WorldHudSystem;
  private readonly damageNumberSystem: DamageNumberSystem;
  private readonly projectileSystem: ProjectileSystem;
  private readonly vfxSystem: VfxSystem;
  private readonly combatSystem: CombatPresentationSystem;
  private readonly director: PresentationDirector;
  private readonly defaultHeroManifestId: string;
  private lastDamageEventId = 0;
  private displayedEnemyName: string | undefined;
  private displayedEnemyVisualManifestId: string | undefined;
  private displayedEnemyEncounterKey: string | undefined;
  private displayedEnemyIsBoss = false;
  private defeatedEnemyPresentedAtMs: number | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBridge: () => GameBridge | undefined,
  ) {
    const { width, height } = scene.scale;
    this.entityY = height * 0.61;
    this.playerHomeX = width * 0.32;
    this.enemyHomeX = width * 0.68;

    const heroManifest = renderManifestRegistry.requireDefaultActor();
    const enemyManifest = renderManifestRegistry.requireDefaultStaticActor();
    this.defaultHeroManifestId = heroManifest.id;
    const playerSprite = createActorSprite(scene, heroManifest);
    this.playerBody = scene.add.container(this.playerHomeX, this.entityY, [playerSprite]).setDepth(5);
    this.enemySystem = new EnemyPresentationSystem(scene, this.enemyHomeX, this.entityY, enemyManifest);
    this.enemyBody = this.enemySystem.body;

    this.heroSystem = new HeroPresentationSystem(playerSprite, heroManifest.id);
    this.actorSystem = new ActorSystem(scene);
    this.actorSystem.register(this.playerBody, this.playerHomeX, heroManifest.ambientMotion);
    this.actorSystem.register(this.enemyBody, this.enemyHomeX, enemyManifest.ambientMotion);

    this.damageNumberSystem = new DamageNumberSystem(
      scene,
      (target) => ({
        x: target === "player" ? this.playerHomeX : this.enemyHomeX,
        y: scene.scale.height * 0.45,
      }),
      (target) => renderManifestRegistry.requireDefaultFloatingText(target).id,
    );
    this.vfxSystem = new VfxSystem(scene);
    this.projectileSystem = new ProjectileSystem(
      scene,
      (manifest) => ({
        startX: this.playerHomeX + manifest.trajectory.sourceOffsetX,
        endX: this.enemyHomeX + manifest.trajectory.targetOffsetX,
        y: this.playerBody.y + manifest.trajectory.offsetY,
      }),
      this.vfxSystem,
    );
    this.combatSystem = new CombatPresentationSystem(
      scene,
      { player: this.playerBody, enemy: this.enemyBody },
      this.actorSystem,
      this.heroSystem,
      this.projectileSystem,
      this.damageNumberSystem,
      () => selectWeaponPresentation(this.getBridge()),
      (event) => { this.handlePresentedImpact(event); },
    );
    this.director = new PresentationDirector({
      presentCombatEvent: (event) => this.combatSystem.present(event),
    });

    this.hudSystem = new WorldHudSystem(scene, renderManifestRegistry.requireDefaultWorldHud());
    this.hudSystem.createPlayer(this.playerHomeX, this.entityY);
    this.hudSystem.createEnemy(this.enemyHomeX, this.entityY);
  }

  public update(bridge: GameBridge): void {
    this.updatePlayer(bridge);
    this.updateEnemy(bridge);
    this.updateDamageEvents(bridge);
    this.director.update();
  }

  public setEnemyVisible(visible: boolean): void {
    this.enemySystem.setVisible(visible);
    this.hudSystem.setEnemyVisible(visible);
  }

  public clear(): void {
    clearPresentedEnemyHealth();
    this.director.clear();
    this.damageNumberSystem.clear();
    this.projectileSystem.clear();
    this.vfxSystem.clear();
    this.actorSystem.clear();
    this.heroSystem.clear();
    this.hudSystem.clear();
    this.enemySystem.clear();
    this.playerBody.destroy(true);
  }

  private updatePlayer(bridge: GameBridge): void {
    this.hudSystem.updatePlayer(bridge.playerHealth, bridge.playerMaxHealth);
    const weapon = selectWeaponPresentation(bridge);
    this.heroSystem.update({
      visualManifestId: weapon.visualManifestId,
      combatState: bridge.combatState,
      zoneIndex: bridge.world.zoneIndex,
      segmentIndex: bridge.world.segmentIndex,
    });
    this.actorSystem.setAmbientMotion(
      this.playerBody,
      renderManifestRegistry.requireActor(weapon.visualManifestId ?? this.defaultHeroManifestId).ambientMotion,
    );
  }

  private updateEnemy(bridge: GameBridge): void {
    const incomingName = bridge.enemyName;
    const incomingVisualManifestId = bridge.enemyVisualManifestId;
    const incomingEncounterKey = this.getEncounterPresentationKey(bridge);
    const hasAuthoritativeEnemy = incomingName.length > 0
      && incomingVisualManifestId.length > 0
      && bridge.enemyMaxHealth > 0;

    if (!hasAuthoritativeEnemy) {
      this.displayedEnemyName = undefined;
      this.displayedEnemyVisualManifestId = undefined;
      this.displayedEnemyEncounterKey = undefined;
      this.displayedEnemyIsBoss = false;
      this.defeatedEnemyPresentedAtMs = undefined;
      clearPresentedEnemyHealth();
      this.setEnemyVisible(false);
      return;
    }

    const incomingIsBoss = bridge.world.encounterType === "boss";

    if (this.displayedEnemyVisualManifestId === undefined) {
      this.adoptEnemyPresentation(
        incomingName,
        incomingVisualManifestId,
        incomingEncounterKey,
        incomingIsBoss,
        bridge.enemyHealth,
        bridge.enemyMaxHealth,
      );
    } else {
      const identityChanged = incomingEncounterKey !== this.displayedEnemyEncounterKey
        || incomingVisualManifestId !== this.displayedEnemyVisualManifestId
        || incomingName !== this.displayedEnemyName;
      if (identityChanged && !this.canReplacePresentedEnemy()) {
        this.renderDisplayedEnemy(bridge);
        return;
      }
      if (identityChanged) {
        this.adoptEnemyPresentation(
          incomingName,
          incomingVisualManifestId,
          incomingEncounterKey,
          incomingIsBoss,
          bridge.enemyHealth,
          bridge.enemyMaxHealth,
        );
      }
    }

    this.renderDisplayedEnemy(bridge);
  }

  private renderDisplayedEnemy(bridge: GameBridge): void {
    const presented = getPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
    const showEnemy = !(bridge.combatState === "idle" && presented.current <= 0);
    if (!showEnemy) {
      this.setEnemyVisible(false);
      return;
    }

    const visualManifestId = this.displayedEnemyVisualManifestId ?? bridge.enemyVisualManifestId;
    const displayedName = this.displayedEnemyName ?? bridge.enemyName;
    this.enemySystem.update({
      visualManifestId,
      isBoss: this.displayedEnemyIsBoss,
    });
    this.actorSystem.setAmbientMotion(
      this.enemyBody,
      renderManifestRegistry.requireStaticActor(visualManifestId).ambientMotion,
    );
    this.hudSystem.layoutEnemy(this.enemyHomeX, this.enemyBody.y, this.enemySystem.hudLayout);
    this.hudSystem.updateEnemy(
      presented.current,
      presented.maximum,
      displayedName,
    );

    this.setEnemyVisible(true);
  }

  private adoptEnemyPresentation(
    name: string,
    visualManifestId: string,
    encounterKey: string,
    isBoss: boolean,
    currentHealth: number,
    maxHealth: number,
  ): void {
    this.displayedEnemyName = name;
    this.displayedEnemyVisualManifestId = visualManifestId;
    this.displayedEnemyEncounterKey = encounterKey;
    this.displayedEnemyIsBoss = isBoss;
    this.defeatedEnemyPresentedAtMs = undefined;
    resetPresentedEnemyHealth(currentHealth, maxHealth);
  }

  private getEncounterPresentationKey(bridge: GameBridge): string {
    return [
      bridge.world.zoneDefId,
      bridge.world.segmentIndex,
      bridge.world.encounterIndex,
    ].join(":");
  }

  private canReplacePresentedEnemy(): boolean {
    if (!isPresentedEnemyDefeated()) return false;
    if (this.defeatedEnemyPresentedAtMs === undefined) return false;
    return this.scene.time.now - this.defeatedEnemyPresentedAtMs >= DEFEATED_ENEMY_HOLD_MS;
  }

  private handlePresentedImpact(event: PresentationDamageEvent): void {
    if (event.target !== "enemy" || event.targetHealthAfter === undefined) return;
    applyPresentedEnemyImpact(event.targetHealthAfter);
    if (event.targetHealthAfter <= 0 && this.defeatedEnemyPresentedAtMs === undefined) {
      this.defeatedEnemyPresentedAtMs = this.scene.time.now;
    }

    const bridge = this.getBridge();
    if (bridge !== undefined) this.renderDisplayedEnemy(bridge);
  }

  private updateDamageEvents(bridge: GameBridge): void {
    for (const event of bridge.damageNumbers) {
      if (event.id <= this.lastDamageEventId) continue;
      const presentationEvent = event as PresentationDamageEvent;

      if (presentationEvent.sourceType === "effect") {
        this.combatSystem.present(event);
        this.lastDamageEventId = Math.max(this.lastDamageEventId, event.id);
        continue;
      }

      if (event.target === "player") {
        const visualManifestId = this.displayedEnemyVisualManifestId ?? bridge.enemyVisualManifestId;
        if (visualManifestId.length > 0) {
          const style = this.resolveEnemyVfxStyle(visualManifestId);
          if (style !== undefined) {
            this.vfxSystem.presentEnemyAttack(style, this.enemyHomeX, this.playerHomeX, this.entityY);
          }
        }
      }
      this.director.enqueueCombatEvent(event);
      this.lastDamageEventId = Math.max(this.lastDamageEventId, event.id);
    }
  }

  private resolveEnemyVfxStyle(visualManifestId: string): EnemyVfxStyle | undefined {
    if (visualManifestId.includes("undead_skeleton_archer")) return "undead_ranged";
    if (visualManifestId.includes("undead_spectral_knight")) return "undead_spectral";
    if (visualManifestId.includes("undead_lich")) return "undead_lich";
    if (visualManifestId.includes("undead_skeleton_swordsman") || visualManifestId.includes("undead_warrior")) return "undead_melee";
    if (visualManifestId.includes("morgana_witch")) return "morgana_shadow";
    if (visualManifestId.includes("morgana_suppressor")) return "morgana_bolt";
    if (visualManifestId.includes("morgana_dark_knight")) return "morgana_knight";
    if (visualManifestId.includes("morgana_high_priestess")) return "morgana_priestess";
    if (visualManifestId.includes("keeper_warrior")) return "keeper_melee";
    if (visualManifestId.includes("keeper_shaman")) return "keeper_spirit";
    if (visualManifestId.includes("keeper_champion")) return "keeper_champion";
    if (visualManifestId.includes("keeper_ancient")) return "keeper_ancient";
    if (visualManifestId.includes("heretic_thug")) return "heretic_melee";
    if (visualManifestId.includes("heretic_firestarter")) return "heretic_fire";
    if (visualManifestId.includes("heretic_enforcer")) return "heretic_enforcer";
    if (visualManifestId.includes("heretic_madmen")) return "heretic_madmen";
    return undefined;
  }
}
