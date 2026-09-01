import Phaser from "phaser";
import type { WorldHudRenderManifest } from "../RenderManifest";
import {
  worldHudAnchorStore,
  type WorldHudActorId,
} from "../presentation/WorldHudAnchorStore";

type EncounterType = "normal" | "elite" | "boss" | "resource";

interface ActorHealthHud {
  readonly actorId: WorldHudActorId;
  readonly background: Phaser.GameObjects.Rectangle;
  readonly fill: Phaser.GameObjects.Rectangle;
  readonly value: Phaser.GameObjects.Text;
  readonly label: Phaser.GameObjects.Text;
  readonly encounterBadge: Phaser.GameObjects.Text | undefined;
  width: number;
  lastCurrent: number | undefined;
  lastMaximum: number | undefined;
  lastLabel: string | undefined;
  lastX: number | undefined;
  lastBarY: number | undefined;
  lastVisible: boolean | undefined;
}

const ACTOR_HUD_HEAD_GAP = 10;
const STATUS_EFFECT_CLEARANCE = 6;
const ENCOUNTER_BADGE_GAP = 7;

type HudAnchorActor = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

/** Owns health bars and actor labels rendered inside the Phaser world. */
export class WorldHudSystem {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private player!: ActorHealthHud;
  private enemy!: ActorHealthHud;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly manifest: WorldHudRenderManifest,
  ) {}

  public createPlayer(x: number, y: number, playerDisplayName: string): void {
    this.player = this.createActorHud(
      "player",
      x,
      this.resolvePlayerHudY(y),
      this.manifest.healthBar.defaultWidth,
      playerDisplayName,
      this.manifest.actorLabel.playerColor,
      this.colorToNumber(this.manifest.healthBar.upperGradient[1]),
      "500/500",
    );
  }

  public createEnemy(x: number, y: number): void {
    this.enemy = this.createActorHud(
      "enemy",
      x,
      y - this.manifest.healthBar.offsetY,
      this.manifest.healthBar.defaultWidth,
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

  public updateEnemy(
    current: number,
    maximum: number,
    name: string,
    encounterType: EncounterType,
  ): void {
    this.updateActor(this.enemy, current, maximum);
    if (name !== this.enemy.lastLabel) {
      this.enemy.lastLabel = name;
      this.enemy.label.setText(name);
      this.layoutEncounterBadge(this.enemy);
    }
    this.updateEncounterBadge(this.enemy, encounterType);
  }

  public layoutPlayer(
    homeX: number,
    bodyY: number,
    _actor: HudAnchorActor,
  ): void {
    this.layoutActorHud(
      this.player,
      homeX,
      this.resolvePlayerHudY(bodyY),
      this.manifest.healthBar.defaultWidth,
    );
  }

  public layoutEnemy(
    homeX: number,
    bodyY: number,
    actor: HudAnchorActor,
    layout: {
      readonly healthBarWidth: number;
    },
  ): void {
    this.layoutActorHud(
      this.enemy,
      homeX,
      this.resolveEnemyHudY(bodyY, actor),
      layout.healthBarWidth,
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
    worldHudAnchorStore.reset();
  }

  private setActorVisible(actor: ActorHealthHud, visible: boolean): void {
    if (actor.lastVisible === visible) return;
    actor.lastVisible = visible;
    actor.background.setVisible(visible);
    actor.fill.setVisible(visible);
    actor.value.setVisible(visible);
    actor.label.setVisible(visible);
    actor.encounterBadge?.setVisible(visible && actor.encounterBadge.text.length > 0);
    worldHudAnchorStore.setVisible(actor.actorId, visible);
  }

  private resolvePlayerHudY(bodyY: number): number {
    return bodyY - this.manifest.healthBar.offsetY - STATUS_EFFECT_CLEARANCE;
  }

  private resolveEnemyHudY(bodyY: number, actor: HudAnchorActor): number {
    const actorTopY = bodyY + actor.y - actor.displayHeight * actor.originY;
    return actorTopY - ACTOR_HUD_HEAD_GAP - STATUS_EFFECT_CLEARANCE;
  }

  private createActorHud(
    actorId: WorldHudActorId,
    x: number,
    barY: number,
    width: number,
    label: string,
    labelColor: string,
    fillColor: number,
    initialValue: string,
  ): ActorHealthHud {
    const { healthBar, valueText, actorLabel } = this.manifest;
    const background = this.scene.add
      .rectangle(
        x,
        barY,
        width,
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
        x - width / 2,
        barY,
        width,
        healthBar.height,
        fillColor,
      )
      .setOrigin(0, 0.5)
      .setDepth(healthBar.fillDepth);
    const value = this.scene.add
      .text(x, barY - valueText.offsetY, initialValue, {
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
      .text(x, barY - actorLabel.offsetY, label, {
        fontFamily: actorLabel.fontFamily,
        fontSize: `${String(actorLabel.fontSize)}px`,
        fontStyle: actorLabel.fontStyle,
        color: labelColor,
        letterSpacing: actorLabel.letterSpacing,
      })
      .setOrigin(0.5)
      .setDepth(actorLabel.depth);
    const encounterBadge = actorId === "enemy"
      ? this.scene.add
          .text(x, barY - actorLabel.offsetY, "", {
            fontFamily: actorLabel.fontFamily,
            fontSize: "7px",
            fontStyle: "bold",
            color: "#d6e9ff",
            backgroundColor: "rgba(29, 54, 82, 0.92)",
          })
          .setPadding(4, 1, 4, 1)
          .setOrigin(0, 0.5)
          .setDepth(actorLabel.depth + 1)
          .setVisible(false)
      : undefined;

    this.objects.push(background, fill, value, labelText);
    if (encounterBadge !== undefined) this.objects.push(encounterBadge);
    const hud: ActorHealthHud = {
      actorId,
      background,
      fill,
      value,
      label: labelText,
      encounterBadge,
      width,
      lastCurrent: undefined,
      lastMaximum: undefined,
      lastLabel: label,
      lastX: undefined,
      lastBarY: undefined,
      lastVisible: true,
    };
    this.layoutActorHud(hud, x, barY, width);
    return hud;
  }

  private layoutActorHud(
    hud: ActorHealthHud,
    x: number,
    barY: number,
    width: number,
  ): void {
    if (hud.lastX === x && hud.lastBarY === barY && hud.width === width) return;

    const { healthBar, valueText, actorLabel } = this.manifest;
    const widthChanged = hud.width !== width;
    hud.width = width;
    hud.lastX = x;
    hud.lastBarY = barY;
    hud.background
      .setPosition(x, barY)
      .setSize(width, healthBar.height);
    hud.fill.setPosition(x - width / 2, barY);
    hud.value.setPosition(x, barY - valueText.offsetY);
    hud.label.setPosition(x, barY - actorLabel.offsetY);
    this.layoutEncounterBadge(hud);

    if (
      widthChanged
      && hud.lastCurrent !== undefined
      && hud.lastMaximum !== undefined
    ) {
      const ratio = hud.lastMaximum > 0 ? hud.lastCurrent / hud.lastMaximum : 0;
      hud.fill.width = width * Math.max(0, Math.min(1, ratio));
    }

    worldHudAnchorStore.setAnchor(hud.actorId, {
      x,
      y: barY + healthBar.height / 2 + 8,
      visible: hud.background.visible,
    });
  }

  private layoutEncounterBadge(hud: ActorHealthHud): void {
    if (hud.encounterBadge === undefined) return;
    hud.encounterBadge.setPosition(
      hud.label.x + hud.label.displayWidth / 2 + ENCOUNTER_BADGE_GAP,
      hud.label.y,
    );
  }

  private updateEncounterBadge(hud: ActorHealthHud, encounterType: EncounterType): void {
    const badge = hud.encounterBadge;
    if (badge === undefined) return;

    if (encounterType !== "elite" && encounterType !== "boss") {
      badge.setText("").setVisible(false);
      return;
    }

    const isBoss = encounterType === "boss";
    badge
      .setText(isBoss ? "BOSS" : "ÉLITE")
      .setColor(isBoss ? "#ffd9d4" : "#d6e9ff")
      .setBackgroundColor(isBoss ? "rgba(91, 24, 24, 0.94)" : "rgba(29, 54, 82, 0.92)")
      .setVisible(hud.lastVisible !== false);
    this.layoutEncounterBadge(hud);
  }

  private updateActor(
    hud: ActorHealthHud,
    current: number,
    maximum: number,
  ): void {
    if (hud.lastCurrent === current && hud.lastMaximum === maximum) return;
    hud.lastCurrent = current;
    hud.lastMaximum = maximum;

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
