import type Phaser from "phaser";
import type { DamageNumberEvent } from "../../GameBridge";
import { applyPresentedEnemyImpact } from "../presentation/CombatPresentedHealth";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";

type PresentedDamageEvent = DamageNumberEvent & {
  readonly targetHealthAfter?: number;
};

export interface DamageNumberAnchor {
  readonly x: number;
  readonly y: number;
}

export type DamageNumberAnchorResolver = (
  target: DamageNumberEvent["target"],
) => DamageNumberAnchor;

export type DamageNumberProfileResolver = (
  target: DamageNumberEvent["target"],
) => string;

/** Presentation-only floating combat text; updates presented HP at visual impact. */
export class DamageNumberSystem {
  private readonly activeTexts = new Set<Phaser.GameObjects.Text>();
  private readonly activeTweens = new Set<Phaser.Tweens.Tween>();

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolveAnchor: DamageNumberAnchorResolver,
    private readonly resolveProfileId: DamageNumberProfileResolver,
  ) {}

  public present(event: DamageNumberEvent): void {
    const presentedEvent = event as PresentedDamageEvent;
    if (event.target === "enemy" && presentedEvent.targetHealthAfter !== undefined) {
      applyPresentedEnemyImpact(presentedEvent.targetHealthAfter);
    }

    const anchor = this.resolveAnchor(event.target);
    const manifest = renderManifestRegistry.requireFloatingText(
      this.resolveProfileId(event.target),
    );
    const offsetX = (Math.random() - 0.5) * manifest.motion.randomOffsetX;
    const roundedAmount = Math.round(event.amount * 10) / 10;
    const displayedAmount = Number.isInteger(roundedAmount)
      ? String(Math.trunc(roundedAmount))
      : roundedAmount.toFixed(1);

    const damageText = this.scene.add
      .text(anchor.x + offsetX, anchor.y, `-${displayedAmount}`, {
        fontFamily: manifest.textStyle.fontFamily,
        fontSize: `${String(manifest.textStyle.fontSize)}px`,
        fontStyle: manifest.textStyle.fontStyle,
        color: manifest.textStyle.color,
        stroke: manifest.textStyle.strokeColor,
        strokeThickness: manifest.textStyle.strokeThickness,
      })
      .setOrigin(0.5)
      .setScale(manifest.motion.startScale)
      .setDepth(manifest.depth);

    this.activeTexts.add(damageText);
    const tween = this.scene.tweens.add({
      targets: damageText,
      y: anchor.y - manifest.motion.riseDistance,
      alpha: 0,
      scale: manifest.motion.endScale,
      duration: manifest.motion.durationMs,
      ease: manifest.motion.ease,
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.activeTexts.delete(damageText);
        damageText.destroy();
      },
    });
    this.activeTweens.add(tween);
  }

  public clear(): void {
    for (const tween of this.activeTweens) tween.stop();
    this.activeTweens.clear();
    for (const damageText of this.activeTexts) damageText.destroy();
    this.activeTexts.clear();
  }
}
