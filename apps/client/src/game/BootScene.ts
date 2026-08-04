import Phaser from "phaser";

/**
 * Bootstrap scene.
 *
 * Proves Phaser is initialised and rendering. It draws a clearly-identifiable
 * placeholder and contains no gameplay logic.
 */
export class BootScene extends Phaser.Scene {
  public static readonly KEY = "BootScene";

  constructor() {
    super(BootScene.KEY);
  }

  public create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, "Albion Idle\nPhaser bootstrap scene", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#e6e8ee",
        align: "center",
      })
      .setOrigin(0.5);
  }
}
