import Phaser from "phaser";
import type { ProjectileImpactEffectManifest } from "../RenderManifest";

export type EnemyVfxStyle =
  | "undead_melee"
  | "undead_ranged"
  | "undead_spectral"
  | "undead_lich"
  | "morgana_shadow"
  | "morgana_bolt"
  | "morgana_knight"
  | "morgana_priestess"
  | "keeper_melee"
  | "keeper_spirit"
  | "keeper_champion"
  | "keeper_ancient"
  | "heretic_melee"
  | "heretic_fire"
  | "heretic_enforcer"
  | "heretic_madmen";

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

  /** Presentation-only combat cue. Never changes authoritative combat state. */
  public presentEnemyAttack(
    style: EnemyVfxStyle,
    sourceX: number,
    targetX: number,
    y: number,
  ): void {
    switch (style) {
      case "undead_ranged":
        this.presentProjectile(sourceX, targetX, y, 0xc8d7e8, 5, 220, 14);
        return;
      case "undead_lich":
        this.presentProjectile(sourceX, targetX, y, 0x8f5cff, 9, 300, 22);
        return;
      case "undead_spectral":
        this.presentSlash(targetX, y, 0x72e5d1, 24, 340, true);
        return;
      case "undead_melee":
        this.presentSlash(targetX, y, 0xe8edf2, 18, 280);
        return;

      case "morgana_shadow":
        this.presentProjectile(sourceX, targetX, y, 0x9b4de3, 7, 260, 18);
        return;
      case "morgana_bolt":
        this.presentProjectile(sourceX, targetX, y, 0xd14a8b, 5, 220, 15);
        return;
      case "morgana_knight":
        this.presentSlash(targetX, y, 0x7e38a8, 22, 320, true);
        return;
      case "morgana_priestess":
        this.presentProjectile(sourceX, targetX, y, 0xb32bd6, 10, 320, 25);
        return;

      case "keeper_melee":
        this.presentSlash(targetX, y, 0xd0a34c, 19, 290);
        return;
      case "keeper_spirit":
        this.presentProjectile(sourceX, targetX, y, 0x75d6a5, 7, 260, 18);
        return;
      case "keeper_champion":
        this.presentGroundSmash(targetX, y, 0xb88942, 26);
        return;
      case "keeper_ancient":
        this.presentProjectile(sourceX, targetX, y, 0x74d9b4, 10, 320, 26);
        return;

      case "heretic_melee":
        this.presentSlash(targetX, y, 0xe4b34e, 18, 270);
        return;
      case "heretic_fire":
        this.presentProjectile(sourceX, targetX, y, 0xff7a24, 8, 260, 20);
        return;
      case "heretic_enforcer":
        this.presentGroundSmash(targetX, y, 0xd76a28, 25);
        return;
      case "heretic_madmen":
        this.presentGroundSmash(targetX, y, 0xf04b25, 30);
        return;
    }
  }

  public clear(): void {
    for (const tween of this.activeTweens) tween.stop();
    this.activeTweens.clear();
    for (const gameObject of this.activeObjects) gameObject.destroy();
    this.activeObjects.clear();
  }

  private presentProjectile(
    sourceX: number,
    targetX: number,
    y: number,
    color: number,
    radius: number,
    duration: number,
    impactRadius: number,
  ): void {
    const orb = this.scene.add
      .circle(sourceX - 18, y - 34, radius, color, 0.86)
      .setStrokeStyle(2, color, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12);
    this.activeObjects.add(orb);

    const tween = this.scene.tweens.add({
      targets: orb,
      x: targetX,
      y: y - 20,
      alpha: 0.2,
      scale: 1.35,
      duration,
      ease: "Quad.In",
      onComplete: () => {
        this.destroyTransient(orb, tween);
        this.presentEnemyImpact(targetX, y - 20, color, impactRadius);
      },
    });
    this.activeTweens.add(tween);
  }

  private presentSlash(
    targetX: number,
    y: number,
    color: number,
    radius: number,
    duration: number,
    spectral = false,
  ): void {
    const impactY = y - 24;
    const glow = this.scene.add
      .circle(targetX, impactY, radius, color, spectral ? 0.2 : 0.14)
      .setStrokeStyle(spectral ? 3 : 2, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12);
    const slash = this.scene.add
      .ellipse(targetX, impactY, spectral ? 24 : 18, spectral ? 76 : 68, color, spectral ? 0.72 : 0.62)
      .setStrokeStyle(2, color, 1)
      .setAngle(-40)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);
    this.activeObjects.add(glow);
    this.activeObjects.add(slash);

    const glowTween = this.scene.tweens.add({
      targets: glow,
      scale: 1.75,
      alpha: 0,
      duration,
      ease: "Cubic.Out",
      onComplete: () => this.destroyTransient(glow, glowTween),
    });
    const slashTween = this.scene.tweens.add({
      targets: slash,
      scaleX: spectral ? 2.6 : 2.3,
      scaleY: 1.2,
      alpha: 0,
      duration: Math.max(220, duration - 20),
      ease: "Cubic.Out",
      onComplete: () => {
        this.destroyTransient(slash, slashTween);
        this.presentEnemyImpact(targetX, impactY, color, radius);
      },
    });
    this.activeTweens.add(glowTween);
    this.activeTweens.add(slashTween);
  }

  private presentGroundSmash(targetX: number, y: number, color: number, radius: number): void {
    const impactY = y - 10;
    const ring = this.scene.add
      .ellipse(targetX, impactY, radius * 2.2, radius * 0.75, color, 0.28)
      .setStrokeStyle(3, color, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12);
    const core = this.scene.add
      .circle(targetX, y - 22, radius * 0.55, color, 0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);
    this.activeObjects.add(ring);
    this.activeObjects.add(core);

    const ringTween = this.scene.tweens.add({
      targets: ring,
      scaleX: 2.1,
      scaleY: 1.5,
      alpha: 0,
      duration: 340,
      ease: "Cubic.Out",
      onComplete: () => this.destroyTransient(ring, ringTween),
    });
    const coreTween = this.scene.tweens.add({
      targets: core,
      scale: 1.8,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => this.destroyTransient(core, coreTween),
    });
    this.activeTweens.add(ringTween);
    this.activeTweens.add(coreTween);
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
