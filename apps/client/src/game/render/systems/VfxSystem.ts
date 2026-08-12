import Phaser from "phaser";
import type { ProjectileImpactEffectManifest } from "../RenderManifest";

export type EnemyVfxStyle = "undead_melee" | "undead_ranged" | "undead_spectral" | "undead_lich";

/** Owns short-lived world VFX created from presentation manifests or combat identity. */
export class VfxSystem {
  private readonly activeObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly activeTweens = new Set<Phaser.Tweens.Tween>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public presentProjectileImpact(
    x: number,
    y: number,
    manifest: ProjectileImpactEffectManifest,
  ): void {
    const burst = this.scene.add
      .circle(
        x,
        y,
        manifest.radius,
        this.parseColor(manifest.fillColor),
        manifest.fillAlpha,
      )
      .setStrokeStyle(
        manifest.strokeWidth,
        this.parseColor(manifest.strokeColor),
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(manifest.depth);

    this.activeObjects.add(burst);
    const tween = this.scene.tweens.add({
      targets: burst,
      scale: manifest.endScale,
      alpha: 0,
      duration: manifest.durationMs,
      ease: "Cubic.Out",
      onComplete: () => this.destroyTransient(burst, tween),
    });
    this.activeTweens.add(tween);
  }

  /**
   * Small procedural cues for enemy identity. These are presentation-only:
   * they never change combat timing, damage, stats or targeting.
   */
  public presentEnemyAttack(
    style: EnemyVfxStyle,
    sourceX: number,
    targetX: number,
    y: number,
  ): void {
    if (style === "undead_ranged" || style === "undead_lich") {
      const lich = style === "undead_lich";
      const orb = this.scene.add
        .circle(sourceX - 18, y - 34, lich ? 9 : 5, lich ? 0x8f5cff : 0xc8d7e8, lich ? 0.85 : 0.75)
        .setStrokeStyle(1, lich ? 0xd7b8ff : 0xffffff, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12);
      this.activeObjects.add(orb);
      const tween = this.scene.tweens.add({
        targets: orb,
        x: targetX,
        y: y - 20,
        alpha: 0.15,
        scale: lich ? 1.5 : 1.15,
        duration: lich ? 300 : 220,
        ease: "Quad.In",
        onComplete: () => {
          this.destroyTransient(orb, tween);
          this.presentEnemyImpact(targetX, y - 20, lich ? 0x8f5cff : 0xc8d7e8, lich ? 22 : 14);
        },
      });
      this.activeTweens.add(tween);
      return;
    }

    if (style === "undead_spectral") {
      const glow = this.scene.add
        .circle(targetX, y - 24, 24, 0x72e5d1, 0.18)
        .setStrokeStyle(3, 0xa8fff1, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12);
      const slash = this.scene.add
        .ellipse(targetX, y - 24, 24, 76, 0x72e5d1, 0.72)
        .setStrokeStyle(2, 0xd8fff8, 1)
        .setAngle(-38)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(13);
      this.activeObjects.add(glow);
      this.activeObjects.add(slash);

      const glowTween = this.scene.tweens.add({
        targets: glow,
        scale: 1.7,
        alpha: 0,
        duration: 340,
        ease: "Cubic.Out",
        onComplete: () => this.destroyTransient(glow, glowTween),
      });
      const slashTween = this.scene.tweens.add({
        targets: slash,
        scaleX: 2.6,
        scaleY: 1.25,
        alpha: 0,
        duration: 320,
        ease: "Cubic.Out",
        onComplete: () => {
          this.destroyTransient(slash, slashTween);
          this.presentEnemyImpact(targetX, y - 24, 0x72e5d1, 24);
        },
      });
      this.activeTweens.add(glowTween);
      this.activeTweens.add(slashTween);
      return;
    }

    const impactY = y - 24;
    const arc = this.scene.add
      .ellipse(targetX, impactY, 18, 68, 0xf4f7fb, 0.72)
      .setStrokeStyle(2, 0xffffff, 1)
      .setAngle(-42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);
    const flash = this.scene.add
      .circle(targetX, impactY, 18, 0xffffff, 0.16)
      .setStrokeStyle(2, 0xe8edf2, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12);
    this.activeObjects.add(arc);
    this.activeObjects.add(flash);

    const arcTween = this.scene.tweens.add({
      targets: arc,
      scaleX: 2.3,
      scaleY: 1.2,
      alpha: 0,
      duration: 280,
      ease: "Cubic.Out",
      onComplete: () => {
        this.destroyTransient(arc, arcTween);
        this.presentEnemyImpact(targetX, impactY, 0xe8edf2, 18);
      },
    });
    const flashTween = this.scene.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 300,
      ease: "Quad.Out",
      onComplete: () => this.destroyTransient(flash, flashTween),
    });
    this.activeTweens.add(arcTween);
    this.activeTweens.add(flashTween);
  }

  public clear(): void {
    for (const tween of this.activeTweens) tween.stop();
    this.activeTweens.clear();
    for (const gameObject of this.activeObjects) gameObject.destroy();
    this.activeObjects.clear();
  }

  private presentEnemyImpact(x: number, y: number, color: number, radius: number): void {
    const burst = this.scene.add
      .circle(x, y, radius, color, 0.28)
      .setStrokeStyle(3, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);
    this.activeObjects.add(burst);
    const tween = this.scene.tweens.add({
      targets: burst,
      scale: 1.9,
      alpha: 0,
      duration: 240,
      ease: "Cubic.Out",
      onComplete: () => this.destroyTransient(burst, tween),
    });
    this.activeTweens.add(tween);
  }

  private destroyTransient(object: Phaser.GameObjects.GameObject, tween: Phaser.Tweens.Tween): void {
    this.activeTweens.delete(tween);
    this.activeObjects.delete(object);
    object.destroy();
  }

  private parseColor(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }
}
