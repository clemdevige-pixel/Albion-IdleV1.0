import type Phaser from "phaser";
import { WORLD_TRAVEL_TIMING } from "../../../runtime/WorldTravelTransition";
import type { CombatPresentationController } from "./CombatPresentationController";
import type { WorldPresentationController } from "./WorldPresentationController";

const TRAVEL_EDGE_PADDING = 140;
const BLACKOUT_DEPTH = 1000;

/** Presents the visual half of one authoritative cross-zone travel boundary. */
export class WorldTravelPresentationController {
  private readonly blackout: Phaser.GameObjects.Rectangle;
  private blackHoldTimer: Phaser.Time.TimerEvent | undefined;
  private active = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly combat: CombatPresentationController,
    private readonly world: WorldPresentationController,
  ) {
    const { width, height } = scene.scale;
    this.blackout = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 1)
      .setDepth(BLACKOUT_DEPTH)
      .setAlpha(0)
      .setVisible(false);
  }

  public isActive(): boolean {
    return this.active;
  }

  public start(): void {
    if (this.active) return;
    this.active = true;
    this.world.beginEnvironmentHold();
    this.combat.beginWorldTravel();
    this.scene.tweens.killTweensOf(this.combat.playerBody);
    this.scene.tweens.add({
      targets: this.combat.playerBody,
      x: this.scene.scale.width + TRAVEL_EDGE_PADDING,
      duration: WORLD_TRAVEL_TIMING.exitWalkMs,
      ease: "Linear",
      onComplete: () => { this.fadeToBlack(); },
    });
  }

  public clear(): void {
    this.scene.tweens.killTweensOf(this.combat.playerBody);
    this.scene.tweens.killTweensOf(this.blackout);
    this.blackHoldTimer?.remove(false);
    this.blackHoldTimer = undefined;
    this.world.endEnvironmentHold();
    this.combat.finishWorldTravel();
    this.blackout.destroy();
    this.active = false;
  }

  private fadeToBlack(): void {
    if (!this.active) return;
    this.blackout.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.blackout,
      alpha: 1,
      duration: WORLD_TRAVEL_TIMING.fadeToBlackMs,
      ease: "Linear",
      onComplete: () => { this.holdBlack(); },
    });
  }

  private holdBlack(): void {
    if (!this.active) return;
    this.world.commitHeldEnvironment();
    this.combat.placePlayerAtTravelEntry(-TRAVEL_EDGE_PADDING);
    this.blackHoldTimer = this.scene.time.delayedCall(
      WORLD_TRAVEL_TIMING.blackHoldMs,
      () => {
        this.blackHoldTimer = undefined;
        this.fadeFromBlack();
      },
    );
  }

  private fadeFromBlack(): void {
    if (!this.active) return;
    this.scene.tweens.add({
      targets: this.blackout,
      alpha: 0,
      duration: WORLD_TRAVEL_TIMING.fadeFromBlackMs,
      ease: "Linear",
      onComplete: () => {
        this.blackout.setVisible(false);
        this.enterScene();
      },
    });
  }

  private enterScene(): void {
    if (!this.active) return;
    this.scene.tweens.add({
      targets: this.combat.playerBody,
      x: this.combat.playerHomeX,
      duration: WORLD_TRAVEL_TIMING.enterWalkMs,
      ease: "Linear",
      onComplete: () => { this.finish(); },
    });
  }

  private finish(): void {
    if (!this.active) return;
    this.world.endEnvironmentHold();
    this.combat.finishWorldTravel();
    this.active = false;
  }
}
