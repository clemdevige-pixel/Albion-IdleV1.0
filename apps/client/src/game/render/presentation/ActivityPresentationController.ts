import type Phaser from "phaser";
import type { GatheringVM } from "../../GameBridge";
import { GatheringPresentationSystem } from "../systems/GatheringPresentationSystem";
import type { CombatPresentationController } from "./CombatPresentationController";

/** Coordinates mutually exclusive world activities such as combat and gathering. */
export class ActivityPresentationController {
  private readonly gatheringSystem: GatheringPresentationSystem;
  private gatheringActive = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly combat: CombatPresentationController,
  ) {
    this.gatheringSystem = new GatheringPresentationSystem(
      scene,
      combat.enemyHomeX,
      combat.entityY,
    );
  }

  public update(gathering: GatheringVM | undefined): void {
    const isGathering = this.gatheringSystem.update(gathering);

    if (isGathering !== this.gatheringActive) {
      this.gatheringActive = isGathering;
      this.resetPlayerPresentation();
    }

    // Gathering may temporarily hide combat presentation, but it must never
    // force an enemy visible. Enemy visibility belongs to the combat
    // presentation controller and requires an authoritative spawned enemy.
    if (isGathering) this.combat.setEnemyVisible(false);
  }

  public clear(): void {
    this.resetPlayerPresentation();
    this.gatheringActive = false;
    this.gatheringSystem.clear();
  }

  private resetPlayerPresentation(): void {
    this.scene.tweens.killTweensOf(this.combat.playerBody);
    this.combat.playerBody
      .setPosition(this.combat.playerHomeX, this.combat.entityY)
      .setAngle(0)
      .setVisible(true);
  }
}
