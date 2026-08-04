import Phaser from "phaser";
import type { GatheringVM } from "../../GameBridge";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { GatheringPresentationSystem } from "../systems/GatheringPresentationSystem";
import type { CombatPresentationController } from "./CombatPresentationController";

/** Coordinates mutually exclusive world activities such as combat and gathering. */
export class ActivityPresentationController {
  private readonly gatheringSystem: GatheringPresentationSystem;

  public constructor(
    scene: Phaser.Scene,
    private readonly combat: CombatPresentationController,
  ) {
    this.gatheringSystem = new GatheringPresentationSystem(
      scene,
      combat.playerBody,
      combat.playerHomeX,
      combat.enemyHomeX,
      combat.entityY,
      renderManifestRegistry.requireDefaultWorldHud().healthBar.defaultWidth,
    );
  }

  public update(gathering: GatheringVM | undefined): void {
    const isGathering = this.gatheringSystem.update(gathering);
    this.combat.setEnemyVisible(!isGathering);
  }

  public clear(): void {
    this.gatheringSystem.clear();
  }
}
