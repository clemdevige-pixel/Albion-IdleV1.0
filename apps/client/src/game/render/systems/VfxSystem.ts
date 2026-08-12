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
        .setDepth(8);
      this.activeObjects.add(orb);
      const tween = this.scene.tweens.add({
        targets: orb,
        x: targetX,
        y: y - 20,
        alpha: 0.15,
        scale: lich ? 1.5 : 1.15,
        duration: lich ? 260 : 180,
        ease: "Quad.In",
        onComplete: () => {
          this.destroyTransient(orb, tween);
          this.presentEnemyImpact(targetX, y - 20, lich ? 0x8f5cff : 0xc8d7e8, lich ? 18 : 11);
        },
      });
      this.activeTweens.add(tween);
      return;
    }

    if (style === "undead_spectral") {
      const slash = this.scene.add
        .ellipse(targetX, y - 22, 16, 54, 0x72e5d1, 0.35)
        .setAngle(-38)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(8);
      this.activeObjects.add(slash);
      const tween = this.scene.tweens.add({
        targets: slash,
        scaleX: 2.2,
        scaleY: 1.25,
        alpha: 0,
        duration: 180,
        ease: "Cubic.Out",
        onComplete: () => this.destroyTransient(slash, tween),
      });
      this.activeTweens.add(tween);
      return;
    }

    const slash = this.scene.add
      .rectangle(targetX, y - 22, 5, 42, 0xe8edf2, 0.6)
      .setAngle(-42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(8);
    this.activeObjects.add(slash);
    const tween = this.scene.tweens.add({
      targets: slash,
      scaleY: 1.35,
      alpha: 0,
      duration: 120,
      ease: "Quad.Out",
      onComplete: () => this.destroyTransient(slash, tween),
    });
    this.activeTweens.add(tween);
  }

  public clear(): void {
    for (const tween of this.activeTweens) tween.stop();
    this.activeTweens.clear();
    for (const gameObject of this.activeObjects) gameObject.destroy();
    this.activeObjects.clear();
  }

  private presentEnemyImpact(x: number, y: number, color: number, radius: number): void {
    const burst = this.scene.add
      .circle(x, y, radius, color, 0.22)
      .setStrokeStyle(2, color, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(8);
    this.activeObjects.add(burst);
    const tween = this.scene.tweens.add({
      targets: burst,
      scale: 1.8,
      alpha: 0,
      duration: 160,
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
