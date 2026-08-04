import Phaser from "phaser";
import type { ProjectileImpactEffectManifest } from "../RenderManifest";

/** Owns short-lived world VFX created from presentation manifests. */
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
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.activeObjects.delete(burst);
        burst.destroy();
      },
    });
    this.activeTweens.add(tween);
  }

  public clear(): void {
    for (const tween of this.activeTweens) tween.stop();
    this.activeTweens.clear();
    for (const gameObject of this.activeObjects) gameObject.destroy();
    this.activeObjects.clear();
  }

  private parseColor(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }
}
