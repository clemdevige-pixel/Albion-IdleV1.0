import Phaser from "phaser";
import type { WorldHudRenderManifest } from "../RenderManifest";

interface ActorHealthHud {
  readonly background: Phaser.GameObjects.Rectangle;
  readonly fill: Phaser.GameObjects.Rectangle;
  readonly value: Phaser.GameObjects.Text;
  readonly label: Phaser.GameObjects.Text;
  width: number;
}

/** Owns health bars and actor labels rendered inside the Phaser world. */
export class WorldHudSystem {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private player!: ActorHealthHud;
  private enemy!: ActorHealthHud;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly manifest: WorldHudRenderManifest,
  ) {}

  public createPlayer(x: number, y: number): void {
    this.player = this.createActorHud(
      x,
      y,
      "HÉROS",
      this.manifest.actorLabel.playerColor,
      this.colorToNumber(this.manifest.healthBar.upperGradient[1]),
      "500/500",
    );
  }

  public createEnemy(x: number, y: number): void {
    this.enemy = this.createActorHud(
      x,
      y,
      "",
      this.manifest.actorLabel.enemyColor,
      this.colorToNumber(this.manifest.healthBar.lowerGradient[0]),
      "0/0",
    );
    this.setEnemyVisible(false);
  }

  public updatePlayer(current: number, maximum: number): void {
    this.updateActor(this.player, current, maximum);
  }

  public updateEnemy(current: number, maximum: number, name: string): void {
    this.updateActor(this.enemy, current, maximum);
    this.enemy.label.setText(name);
  }

  public layoutEnemy(
    homeX: number,
    bodyY: number,
    layout: {
      readonly healthBarWidth: number;
      readonly healthBarOffsetY: number;
    },
  ): void {
    const width = layout.healthBarWidth;
    const barY = bodyY - layout.healthBarOffsetY;
    this.enemy.width = width;
    this.enemy.background
      .setPosition(homeX, barY)
      .setSize(width, this.manifest.healthBar.height);
    this.enemy.fill.setPosition(homeX - width / 2, barY);
    this.enemy.value.setPosition(
      homeX,
      barY - this.manifest.valueText.offsetY,
    );
  }

  public setPlayerVisible(visible: boolean): void {
    this.setActorVisible(this.player, visible);
  }

  public setEnemyVisible(visible: boolean): void {
    this.setActorVisible(this.enemy, visible);
  }

  public clear(): void {
    for (const gameObject of this.objects) gameObject.destroy();
    this.objects.length = 0;
  }

  private setActorVisible(actor: ActorHealthHud, visible: boolean): void {
    actor.background.setVisible(visible);
    actor.fill.setVisible(visible);
    actor.value.setVisible(visible);
    actor.label.setVisible(visible);
  }

  private createActorHud(
    x: number,
    y: number,
    label: string,
    labelColor: string,
    fillColor: number,
    initialValue: string,
  ): ActorHealthHud {
    const { healthBar, valueText, actorLabel } = this.manifest;
    const hpY = y - healthBar.offsetY;
    const background = this.scene.add
      .rectangle(
        x,
        hpY,
        healthBar.defaultWidth,
        healthBar.height,
        this.colorToNumber(healthBar.backgroundColor),
      )
      .setStrokeStyle(
        healthBar.borderWidth,
        this.colorToNumber(healthBar.borderColor),
      )
      .setDepth(healthBar.backgroundDepth);
    const fill = this.scene.add
      .rectangle(
        x - healthBar.defaultWidth / 2,
        hpY,
        healthBar.defaultWidth,
        healthBar.height,
        fillColor,
      )
      .setOrigin(0, 0.5)
      .setDepth(healthBar.fillDepth);
    const value = this.scene.add
      .text(x, hpY - valueText.offsetY, initialValue, {
        fontFamily: valueText.fontFamily,
        fontSize: `${String(valueText.fontSize)}px`,
        fontStyle: valueText.fontStyle,
        color: valueText.color,
        stroke: valueText.strokeColor,
        strokeThickness: valueText.strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(valueText.depth);
    const labelText = this.scene.add
      .text(x, y + actorLabel.offsetY, label, {
        fontFamily: actorLabel.fontFamily,
        fontSize: `${String(actorLabel.fontSize)}px`,
        fontStyle: actorLabel.fontStyle,
        color: labelColor,
        letterSpacing: actorLabel.letterSpacing,
      })
      .setOrigin(0.5)
      .setDepth(actorLabel.depth);

    this.objects.push(background, fill, value, labelText);
    return {
      background,
      fill,
      value,
      label: labelText,
      width: healthBar.defaultWidth,
    };
  }

  private updateActor(
    hud: ActorHealthHud,
    current: number,
    maximum: number,
  ): void {
    const ratio = maximum > 0 ? current / maximum : 0;
    hud.fill.width = hud.width * Math.max(0, Math.min(1, ratio));
    hud.fill.setFillStyle(this.ratioToColor(ratio));
    hud.value.setText(
      `${String(Math.ceil(current))}/${String(Math.ceil(maximum))}`,
    );
  }

  private ratioToColor(ratio: number): number {
    const clamped = Math.max(0, Math.min(1, ratio));
    const colors = clamped > 0.5
      ? this.manifest.healthBar.upperGradient
      : this.manifest.healthBar.lowerGradient;
    const transition = clamped > 0.5
      ? (clamped - 0.5) * 2
      : clamped * 2;
    const from = Phaser.Display.Color.HexStringToColor(colors[0]);
    const to = Phaser.Display.Color.HexStringToColor(colors[1]);
    const red = Math.round(from.red + (to.red - from.red) * transition);
    const green = Math.round(from.green + (to.green - from.green) * transition);
    const blue = Math.round(from.blue + (to.blue - from.blue) * transition);
    return (red << 16) | (green << 8) | blue;
  }

  private colorToNumber(color: string): number {
    return Phaser.Display.Color.HexStringToColor(color).color;
  }
}
