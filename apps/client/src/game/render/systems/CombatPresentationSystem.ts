import type Phaser from "phaser";
import type { DamageNumberEvent, EquipmentSlotVM } from "../../GameBridge";
import { resolveAbilityVfx, type AbilityVfxDefinition } from "../../../data/abilityVfxCatalog";
import { getCombatPresentationGeneration } from "../presentation/CombatPresentationInvalidation";
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

type PresentationDamageEvent = DamageNumberEvent & {
  readonly abilityId?: string;
  readonly sourceType?: "auto_attack" | "ability" | "effect" | "other";
  readonly targetHealthAfter?: number;
};

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
    private readonly onPresentedImpact: (event: PresentationDamageEvent) => void = () => {},
  ) {}

  public present(event: DamageNumberEvent): void {
    const presentationEvent = event as PresentationDamageEvent;
    const weapon = this.getWeaponPresentation();
    const abilityVfx = resolveAbilityVfx(presentationEvent.abilityId);

    if (presentationEvent.sourceType === "effect") {
      this.presentEffectDamage(presentationEvent);
      return;
    }

    if (
      event.target === "enemy"
      && weapon.combatPresentation?.kind === "projectile"
    ) {
      this.presentRanged(presentationEvent, weapon.combatPresentation, abilityVfx);
      return;
    }
    this.presentMelee(presentationEvent, weapon.visualManifestId, abilityVfx);
  }

  private presentEffectDamage(event: PresentationDamageEvent): void {
    this.damageNumberSystem.present(event);
    this.onPresentedImpact(event);
  }

  private presentMelee(
    event: PresentationDamageEvent,
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
      this.onPresentedImpact(event);
    });
  }

  private presentRanged(
    event: PresentationDamageEvent,
    profile: NonNullable<EquipmentSlotVM["combatPresentation"]>,
    abilityVfx: AbilityVfxDefinition | undefined,
  ): void {
    const generation = getCombatPresentationGeneration();
    this.heroSystem.play("attack");
    this.scene.time.delayedCall(profile.releaseDelayMs, () => {
      if (generation !== getCombatPresentationGeneration()) return;
      this.projectileSystem.present({
        manifest: renderManifestRegistry.requireProjectile(profile.projectileId),
        onImpact: () => {
          if (generation !== getCombatPresentationGeneration()) return;
          if (abilityVfx !== undefined) {
            this.presentAbilityVfx(this.actors.enemy, abilityVfx);
          }
          this.damageNumberSystem.present(event);
          this.presentVictimReaction(this.actors.enemy, "enemy");
          this.onPresentedImpact(event);
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

    switch (definition.kind) {
      case "slash":
        this.drawSlash(graphics, definition.layers);
        break;
      case "pierce":
        this.drawPierce(graphics, definition.layers);
        break;
      case "storm":
        this.drawStorm(graphics, definition.layers);
        break;
      case "shockwave":
        this.drawShockwave(graphics, definition.layers);
        break;
      case "burst":
      default:
        this.drawBurst(graphics, definition.layers);
        break;
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

  private drawSlash(graphics: Phaser.GameObjects.Graphics, layers: number): void {
    for (let layer = 0; layer < layers; layer += 1) {
      const offset = (layer - (layers - 1) / 2) * 9;
      graphics.lineBetween(-24 + offset, 25, 24 + offset, -25);
    }
  }

  private drawBurst(graphics: Phaser.GameObjects.Graphics, layers: number): void {
    const radius = 22;
    for (let layer = 0; layer < layers; layer += 1) {
      graphics.strokeCircle(0, 0, radius + layer * 7);
    }
    graphics.lineBetween(-30, 0, 30, 0);
    graphics.lineBetween(0, -30, 0, 30);
    graphics.lineBetween(-22, -22, 22, 22);
    graphics.lineBetween(-22, 22, 22, -22);
  }

  private drawPierce(graphics: Phaser.GameObjects.Graphics, layers: number): void {
    for (let layer = 0; layer < layers; layer += 1) {
      const offset = (layer - (layers - 1) / 2) * 7;
      graphics.lineBetween(-38, offset, 34, offset);
      graphics.lineBetween(34, offset, 20, offset - 9);
      graphics.lineBetween(34, offset, 20, offset + 9);
    }
  }

  private drawStorm(graphics: Phaser.GameObjects.Graphics, layers: number): void {
    for (let layer = 0; layer < layers; layer += 1) {
      const radius = 18 + layer * 8;
      graphics.strokeCircle(0, 0, radius);
      const direction = layer % 2 === 0 ? 1 : -1;
      graphics.lineBetween(-radius, -6 * direction, radius, 6 * direction);
      graphics.lineBetween(-6 * direction, -radius, 6 * direction, radius);
    }
  }

  private drawShockwave(graphics: Phaser.GameObjects.Graphics, layers: number): void {
    for (let layer = 0; layer < layers; layer += 1) {
      const radiusX = 25 + layer * 10;
      const radiusY = 10 + layer * 4;
      graphics.strokeEllipse(0, 15, radiusX * 2, radiusY * 2);
    }
    graphics.lineBetween(-22, 20, -10, 4);
    graphics.lineBetween(22, 20, 10, 4);
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
