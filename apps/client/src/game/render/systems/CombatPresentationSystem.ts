import type Phaser from "phaser";
import type { DamageNumberEvent, EquipmentSlotVM } from "../../GameBridge";
import { resolveAbilityVfx, type AbilityVfxDefinition } from "../../../data/abilityVfxCatalog";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { visualProfileRegistry } from "../VisualProfileRegistry";
import type { ActorSystem } from "./ActorSystem";
import type { DamageNumberSystem } from "./DamageNumberSystem";
import type { HeroPresentationSystem } from "./HeroPresentationSystem";
import type { ProjectileSystem } from "./ProjectileSystem";

export interface CombatPresentationActors {
  readonly player: Phaser.GameObjects.Container;
  readonly enemy: Phaser.GameObjects.Container;
}

export interface EquippedWeaponPresentation {
  readonly visualManifestId: string | undefined;
  readonly combatProfileId: string | undefined;
  readonly combatPresentation: EquipmentSlotVM["combatPresentation"];
}

type AbilityDamageEvent = DamageNumberEvent & { readonly abilityId?: string };

/** Translates authoritative combat events into generic visual sequences. */
export class CombatPresentationSystem {
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly actors: CombatPresentationActors,
    private readonly actorSystem: ActorSystem,
    private readonly heroSystem: HeroPresentationSystem,
    private readonly projectileSystem: ProjectileSystem,
    private readonly damageNumberSystem: DamageNumberSystem,
    private readonly getWeaponPresentation: () => EquippedWeaponPresentation,
  ) {}

  public present(event: DamageNumberEvent): void {
    const weapon = this.getWeaponPresentation();
    const abilityVfx = resolveAbilityVfx((event as AbilityDamageEvent).abilityId);
    if (
      event.target === "enemy"
      && weapon.combatPresentation?.kind === "projectile"
    ) {
      this.presentRanged(event, weapon.combatPresentation, abilityVfx);
      return;
    }
    this.presentMelee(event, weapon.visualManifestId, abilityVfx);
  }

  private presentMelee(
    event: DamageNumberEvent,
    visualManifestId: string | undefined,
    abilityVfx: AbilityVfxDefinition | undefined,
  ): void {
    const victim = event.target === "player"
      ? this.actors.player
      : this.actors.enemy;
    const attacker = event.target === "player"
      ? this.actors.enemy
      : this.actors.player;
    const defaultAttackDistance = event.target === "player" ? -48 : 48;
    const heroManifest =
      event.target === "enemy" && visualManifestId !== undefined
        ? renderManifestRegistry.requireActor(visualManifestId)
        : undefined;
    const presentation = heroManifest === undefined
      ? undefined
      : visualProfileRegistry.resolve(
          heroManifest.visualProfile,
          heroManifest.visualParameters,
        );

    if (event.target === "enemy" && heroManifest !== undefined) {
      this.heroSystem.play("attack");
    }

    this.actorSystem.presentApproach({
      body: attacker,
      distance: presentation?.approachDistance ?? defaultAttackDistance,
      durationMs: presentation?.motionDurationMs ?? 90,
    });

    this.scene.time.delayedCall(presentation?.impactDelayMs ?? 75, () => {
      if (abilityVfx !== undefined && event.target === "enemy") {
        this.presentAbilityVfx(victim, abilityVfx);
      }
      this.damageNumberSystem.present(event);
      this.presentVictimReaction(victim, event.target);
    });
  }

  private presentRanged(
    event: DamageNumberEvent,
    profile: NonNullable<EquipmentSlotVM["combatPresentation"]>,
    abilityVfx: AbilityVfxDefinition | undefined,
  ): void {
    this.heroSystem.play("attack");
    this.scene.time.delayedCall(profile.releaseDelayMs, () => {
      this.projectileSystem.present({
        manifest: renderManifestRegistry.requireProjectile(profile.projectileId),
        onImpact: () => {
          if (abilityVfx !== undefined) {
            this.presentAbilityVfx(this.actors.enemy, abilityVfx);
          }
          this.damageNumberSystem.present(event);
          this.presentVictimReaction(this.actors.enemy, "enemy");
        },
      });
    });
  }

  private presentAbilityVfx(
    victim: Phaser.GameObjects.Container,
    definition: AbilityVfxDefinition,
  ): void {
    const graphics = this.scene.add.graphics();
    graphics.setPosition(victim.x, victim.y - 4);
    graphics.setDepth(120);
    graphics.setScale(definition.scale);
    graphics.lineStyle(definition.strokeWidth, definition.color, 0.95);

    if (definition.kind === "slash") {
      for (let layer = 0; layer < definition.layers; layer += 1) {
        const offset = (layer - (definition.layers - 1) / 2) * 9;
        graphics.lineBetween(-24 + offset, 25, 24 + offset, -25);
      }
    } else {
      const radius = 22;
      for (let layer = 0; layer < definition.layers; layer += 1) {
        graphics.strokeCircle(0, 0, radius + layer * 7);
      }
      graphics.lineBetween(-30, 0, 30, 0);
      graphics.lineBetween(0, -30, 0, 30);
      graphics.lineBetween(-22, -22, 22, 22);
      graphics.lineBetween(-22, 22, 22, -22);
    }

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: definition.scale * 1.22,
      scaleY: definition.scale * 1.22,
      duration: definition.durationMs,
      ease: "Quad.easeOut",
      onComplete: () => { graphics.destroy(); },
    });
  }

  private presentVictimReaction(
    victim: Phaser.GameObjects.Container,
    target: "player" | "enemy",
  ): void {
    this.actorSystem.presentHitReaction({
      body: victim,
      recoilDistance: target === "player" ? -12 : 12,
    });
  }
}
