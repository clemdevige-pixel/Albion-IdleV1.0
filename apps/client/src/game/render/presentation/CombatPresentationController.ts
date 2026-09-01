import type Phaser from "phaser";
import type { DamageNumberEvent, GameBridge } from "../../GameBridge";
import { resolveEnemyVfxStyle } from "../EnemyVfxPresentationCatalog";
import { createActorSprite } from "../PhaserActorRenderer";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { ActorSystem } from "../systems/ActorSystem";
import { CombatPresentationSystem } from "../systems/CombatPresentationSystem";
import { DamageNumberSystem } from "../systems/DamageNumberSystem";
import { EnemyPresentationSystem } from "../systems/EnemyPresentationSystem";
import { HeroPresentationSystem } from "../systems/HeroPresentationSystem";
import { ProjectileSystem } from "../systems/ProjectileSystem";
import { VfxSystem } from "../systems/VfxSystem";
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
  readonly encounterKey?: string;
};

type PresentedEncounterType = GameBridge["world"]["encounterType"];

const DEFEATED_ENEMY_HOLD_MS = 120;

/** Coordinates actors, combat events and in-world combat HUD. */
export class CombatPresentationController {
  public readonly playerBody: Phaser.GameObjects.Container;
  public readonly enemyBody: Phaser.GameObjects.Container;
  public readonly playerHomeX: number;
  public readonly enemyHomeX: number;
  public readonly entityY: number;

  private readonly playerSprite: Phaser.GameObjects.Sprite;
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
  private lastPlayerAmbientManifestId: string | undefined;
  private lastEnemyAmbientManifestId: string | undefined;
  private displayedEnemyName: string | undefined;
  private displayedEnemyVisualManifestId: string | undefined;
  private displayedEnemyEncounterKey: string | undefined;
  private displayedEnemyEncounterType: PresentedEncounterType = "normal";
  private displayedEnemyIsBoss = false;
  private defeatedEnemyPresentedAtMs: number | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBridge: () => GameBridge | undefined,
    playerDisplayName: string,
  ) {
    const { width, height } = scene.scale;
    this.playerHomeX = width * 0.32;
    this.enemyHomeX = width * 0.68;

    const defaultHeroManifest = renderManifestRegistry.requireDefaultActor();
    this.defaultHeroManifestId = defaultHeroManifest.id;

    const initialWeapon = selectWeaponPresentation(this.getBridge());
    const initialHeroManifest = renderManifestRegistry.requireActor(
      initialWeapon.visualManifestId ?? this.defaultHeroManifestId,
    );
    const environmentManifest = renderManifestRegistry.requireEnvironment(
      this.getBridge()?.world.environmentVisualManifestId
        ?? renderManifestRegistry.requireDefaultEnvironment().id,
    );
    this.entityY = height * environmentManifest.layout.groundLineYRatio
      - initialHeroManifest.offset.y;
    const enemyManifest = renderManifestRegistry.requireDefaultStaticActor();
    this.playerSprite = createActorSprite(scene, initialHeroManifest);
    this.playerBody = scene.add.container(this.playerHomeX, this.entityY, [this.playerSprite]).setDepth(5);
    this.enemySystem = new EnemyPresentationSystem(scene, this.enemyHomeX, this.entityY, enemyManifest);
    this.enemyBody = this.enemySystem.body;

    this.heroSystem = new HeroPresentationSystem(this.playerSprite, this.defaultHeroManifestId);
    this.actorSystem = new ActorSystem(scene);
    this.actorSystem.register(this.playerBody, this.playerHomeX, initialHeroManifest.ambientMotion);
    this.actorSystem.register(this.enemyBody, this.enemyHomeX, enemyManifest.ambientMotion);
    this.lastPlayerAmbientManifestId = initialHeroManifest.id;
    this.lastEnemyAmbientManifestId = enemyManifest.id;

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
    this.hudSystem.createPlayer(this.playerHomeX, this.entityY, playerDisplayName);
    this.hudSystem.createEnemy(this.enemyHomeX, this.entityY);
    this.hudSystem.layoutPlayer(this.playerHomeX, this.playerBody.y, this.playerSprite);
  }

  public update(bridge: GameBridge, bridgeChanged = true): void {
    if (bridgeChanged) {
      this.updatePlayer(bridge);
      this.updateDamageEvents(bridge);
    }
    if (bridgeChanged || this.requiresEnemyFrameSync(bridge)) {
      this.updateEnemy(bridge);
    }
    this.director.update();
  }

  public setEnemyVisible(visible: boolean): void {
    this.enemySystem.setVisible(visible);
    this.hudSystem.setEnemyVisible(visible);
  }

  public beginWorldTravel(): void {
    const bridge = this.getBridge();
    const latestDamageEventId = bridge?.damageNumbers.at(-1)?.id ?? this.lastDamageEventId;
    this.lastDamageEventId = Math.max(this.lastDamageEventId, latestDamageEventId);
    this.invalidateEncounterPresentation();
    this.scene.tweens.killTweensOf(this.playerBody);
    this.actorSystem.suspendAmbientMotion(this.playerBody);
    this.playerBody.setVisible(true);
    this.hudSystem.setPlayerVisible(false);
    this.heroSystem.play("walk");
  }

  public placePlayerAtTravelEntry(x: number): void {
    this.scene.tweens.killTweensOf(this.playerBody);
    this.actorSystem.suspendAmbientMotion(this.playerBody);
    this.playerBody.x = x;
    this.playerBody.setVisible(true);
    this.heroSystem.play("walk");
  }

  public finishWorldTravel(): void {
    this.scene.tweens.killTweensOf(this.playerBody);
    this.playerBody.x = this.playerHomeX;
    this.playerBody.setVisible(true);
    this.heroSystem.play("idle");
    this.actorSystem.resumeAmbientMotion(this.playerBody);
    this.hudSystem.setPlayerVisible(true);
  }

  public invalidateEncounterPresentation(): void {
    this.director.clear();
    this.damageNumberSystem.clear();
    this.vfxSystem.clear();
    this.displayedEnemyName = undefined;
    this.displayedEnemyVisualManifestId = undefined;
    this.displayedEnemyEncounterKey = undefined;
    this.displayedEnemyEncounterType = "normal";
    this.displayedEnemyIsBoss = false;
    this.defeatedEnemyPresentedAtMs = undefined;
    clearPresentedEnemyHealth();
    this.setEnemyVisible(false);
  }

  public clear(): void {
    this.invalidateEncounterPresentation();
    this.projectileSystem.clear();
    this.actorSystem.clear();
    this.heroSystem.clear();
    this.hudSystem.clear();
    this.enemySystem.clear();
    this.playerBody.destroy(true);
  }

  private updatePlayer(bridge: GameBridge): void {
    this.hudSystem.updatePlayer(bridge.playerHealth, bridge.playerMaxHealth);
    const weapon = selectWeaponPresentation(bridge);
    const visualManifestId = weapon.visualManifestId ?? this.defaultHeroManifestId;
    this.heroSystem.update({
      visualManifestId: weapon.visualManifestId,
      combatState: bridge.combatState,
      zoneIndex: bridge.world.zoneIndex,
      segmentIndex: bridge.world.segmentIndex,
    });
    if (visualManifestId !== this.lastPlayerAmbientManifestId) {
      this.lastPlayerAmbientManifestId = visualManifestId;
      this.actorSystem.setAmbientMotion(
        this.playerBody,
        renderManifestRegistry.requireActor(visualManifestId).ambientMotion,
      );
    }
    this.hudSystem.layoutPlayer(
      this.playerHomeX,
      this.playerBody.y,
      this.playerSprite,
    );
  }

  private updateEnemy(bridge: GameBridge): void {
    const incomingName = bridge.enemyName;
    const incomingVisualManifestId = bridge.enemyVisualManifestId;
    const incomingEncounterKey = bridge.enemyEncounterKey;
    const hasAuthoritativeEnemy = incomingEncounterKey.length > 0
      && incomingName.length > 0
      && incomingVisualManifestId.length > 0
      && bridge.enemyMaxHealth > 0;

    if (!hasAuthoritativeEnemy) {
      this.displayedEnemyName = undefined;
      this.displayedEnemyVisualManifestId = undefined;
      this.displayedEnemyEncounterKey = undefined;
      this.displayedEnemyEncounterType = "normal";
      this.displayedEnemyIsBoss = false;
      this.defeatedEnemyPresentedAtMs = undefined;
      clearPresentedEnemyHealth();
      this.setEnemyVisible(false);
      return;
    }

    const incomingEncounterType = bridge.world.encounterType;
    const incomingIsBoss = incomingEncounterType === "boss";

    if (this.displayedEnemyVisualManifestId === undefined) {
      this.adoptEnemyPresentation(
        incomingName,
        incomingVisualManifestId,
        incomingEncounterKey,
        incomingEncounterType,
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
          incomingEncounterType,
          incomingIsBoss,
          bridge.enemyHealth,
          bridge.enemyMaxHealth,
        );
      }
    }

    this.renderDisplayedEnemy(bridge);
  }

  private requiresEnemyFrameSync(bridge: GameBridge): boolean {
    if (this.displayedEnemyVisualManifestId === undefined) return false;
    return bridge.enemyEncounterKey !== this.displayedEnemyEncounterKey
      || bridge.enemyVisualManifestId !== this.displayedEnemyVisualManifestId
      || bridge.enemyName !== this.displayedEnemyName;
  }

  private renderDisplayedEnemy(bridge: GameBridge): void {
    // Rendering requires an encounter identity that this controller explicitly
    // adopted. Never fall back to bridge defaults from asynchronous callbacks:
    // after an encounter boundary those defaults are not enemy authority.
    if (
      this.displayedEnemyEncounterKey === undefined
      || this.displayedEnemyName === undefined
      || this.displayedEnemyVisualManifestId === undefined
    ) {
      this.setEnemyVisible(false);
      return;
    }

    const presented = getPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
    const showEnemy = !(bridge.combatState === "idle" && presented.current <= 0);
    if (!showEnemy) {
      this.setEnemyVisible(false);
      return;
    }

    const visualManifestId = this.displayedEnemyVisualManifestId;
    const displayedName = this.displayedEnemyName;
    this.enemySystem.update({
      visualManifestId,
      isBoss: this.displayedEnemyIsBoss,
    });
    if (visualManifestId !== this.lastEnemyAmbientManifestId) {
      this.lastEnemyAmbientManifestId = visualManifestId;
      this.actorSystem.setAmbientMotion(
        this.enemyBody,
        renderManifestRegistry.requireStaticActor(visualManifestId).ambientMotion,
      );
    }
    this.hudSystem.layoutEnemy(
      this.enemyHomeX,
      this.enemyBody.y,
      this.enemySystem.sprite,
      this.enemySystem.hudLayout,
    );
    this.hudSystem.updateEnemy(
      presented.current,
      presented.maximum,
      displayedName,
      this.displayedEnemyEncounterType,
    );

    this.setEnemyVisible(true);
  }

  private adoptEnemyPresentation(
    name: string,
    visualManifestId: string,
    encounterKey: string,
    encounterType: PresentedEncounterType,
    isBoss: boolean,
    currentHealth: number,
    maxHealth: number,
  ): void {
    this.displayedEnemyName = name;
    this.displayedEnemyVisualManifestId = visualManifestId;
    this.displayedEnemyEncounterKey = encounterKey;
    this.displayedEnemyEncounterType = encounterType;
    this.displayedEnemyIsBoss = isBoss;
    this.defeatedEnemyPresentedAtMs = undefined;
    resetPresentedEnemyHealth(currentHealth, maxHealth);
  }

  private canReplacePresentedEnemy(): boolean {
    if (!isPresentedEnemyDefeated()) return false;
    if (this.defeatedEnemyPresentedAtMs === undefined) return false;
    return this.scene.time.now - this.defeatedEnemyPresentedAtMs >= DEFEATED_ENEMY_HOLD_MS;
  }

  private handlePresentedImpact(event: PresentationDamageEvent): void {
    if (event.target !== "enemy" || event.targetHealthAfter === undefined) return;
    if (this.displayedEnemyEncounterKey === undefined) return;
    if (
      event.encounterKey !== undefined
      && event.encounterKey !== this.displayedEnemyEncounterKey
    ) return;
    applyPresentedEnemyImpact(event.targetHealthAfter);
    if (event.targetHealthAfter <= 0 && this.defeatedEnemyPresentedAtMs === undefined) {
      this.defeatedEnemyPresentedAtMs = this.scene.time.now;
    }

    const bridge = this.getBridge();
    if (bridge !== undefined) this.renderDisplayedEnemy(bridge);
  }

  private updateDamageEvents(bridge: GameBridge): void {
    const latestDamageEvent = bridge.damageNumbers.at(-1);
    if (latestDamageEvent === undefined || latestDamageEvent.id <= this.lastDamageEventId) {
      return;
    }

    for (const event of bridge.damageNumbers) {
      if (event.id <= this.lastDamageEventId) continue;
      const presentationEvent = event as PresentationDamageEvent;

      if (
        event.target === "enemy"
        && presentationEvent.encounterKey !== undefined
        && this.displayedEnemyEncounterKey !== undefined
        && presentationEvent.encounterKey !== this.displayedEnemyEncounterKey
      ) {
        this.lastDamageEventId = Math.max(this.lastDamageEventId, event.id);
        continue;
      }

      if (presentationEvent.sourceType === "effect") {
        this.combatSystem.present(event);
        this.lastDamageEventId = Math.max(this.lastDamageEventId, event.id);
        continue;
      }

      if (event.target === "player") {
        const visualManifestId = this.displayedEnemyVisualManifestId ?? bridge.enemyVisualManifestId;
        if (visualManifestId.length > 0) {
          const style = resolveEnemyVfxStyle(visualManifestId);
          if (style !== undefined) {
            this.vfxSystem.presentEnemyAttack(style, this.enemyHomeX, this.playerHomeX, this.entityY);
          }
        }
      }
      this.director.enqueueCombatEvent(event);
      this.lastDamageEventId = Math.max(this.lastDamageEventId, event.id);
    }
  }
}
