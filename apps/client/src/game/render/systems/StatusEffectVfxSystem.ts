import Phaser from "phaser";
import type { StatusEffectWorldVfx } from "../../../data/statusEffectPresentationCatalog";

/** Presentation-only persistent VFX for active status effects. */
export class StatusEffectVfxSystem {
  private readonly active = new Map<StatusEffectWorldVfx, Phaser.GameObjects.Container>();

  public constructor(private readonly scene: Phaser.Scene) {}

  public sync(styles: readonly StatusEffectWorldVfx[], target: Phaser.GameObjects.Container): void {
    const wanted = new Set(styles);
    for (const [style, container] of this.active) {
      if (wanted.has(style)) continue;
      this.scene.tweens.killTweensOf(container.list);
      container.destroy(true);
      this.active.delete(style);
    }

    for (const style of wanted) {
      let container = this.active.get(style);
      if (container === undefined) {
        container = this.create(style);
        this.active.set(style, container);
      }
      container.setPosition(target.x, target.y - 24);
      container.setVisible(target.visible);
    }
  }

  public clear(): void {
    for (const container of this.active.values()) {
      this.scene.tweens.killTweensOf(container.list);
      container.destroy(true);
    }
    this.active.clear();
  }

  private create(style: StatusEffectWorldVfx): Phaser.GameObjects.Container {
    switch (style) {
      case "burning": {
        const glow = this.scene.add.ellipse(0, 10, 54, 20, 0xff7a24, 0.18);
        const flameA = this.scene.add.circle(-12, 0, 7, 0xff6b24, 0.72);
        const flameB = this.scene.add.circle(0, -8, 9, 0xffb13b, 0.78);
        const flameC = this.scene.add.circle(12, 2, 6, 0xff5420, 0.68);
        const container = this.scene.add.container(0, 0, [glow, flameA, flameB, flameC]).setDepth(14);
        for (const [index, flame] of [flameA, flameB, flameC].entries()) {
          this.scene.tweens.add({
            targets: flame,
            y: flame.y - 8 - index * 2,
            alpha: 0.25,
            scale: 1.2,
            duration: 280 + index * 70,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
          });
        }
        this.scene.tweens.add({
          targets: glow,
          alpha: 0.32,
          scaleX: 1.16,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
        return container;
      }
    }
  }
}
