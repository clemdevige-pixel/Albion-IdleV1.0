import Phaser from "phaser";
import type { GameBridge } from "../../GameBridge";
import { selectActiveGathering } from "./GamePresentationState";
import { ActivityPresentationController } from "./ActivityPresentationController";
import { CombatPresentationController } from "./CombatPresentationController";
import { WorldPresentationController } from "./WorldPresentationController";

/** Thin coordinator for the specialized presentation controllers. */
export class GamePresentationRuntime {
  private combat: CombatPresentationController | undefined;
  private activity: ActivityPresentationController | undefined;
  private world: WorldPresentationController | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBridge: () => GameBridge | undefined,
  ) {}

  public create(): void {
    this.world = new WorldPresentationController(
      this.scene,
      this.getBridge(),
    );
    this.combat = new CombatPresentationController(
      this.scene,
      this.getBridge,
    );
    this.activity = new ActivityPresentationController(
      this.scene,
      this.combat,
    );
  }

  public update(): void {
    const bridge = this.getBridge();
    if (bridge === undefined) return;
    const gathering = selectActiveGathering(bridge);
    this.combat?.update(bridge);
    this.activity?.update(gathering);
    this.world?.update(bridge, gathering);
  }

  public clear(): void {
    this.activity?.clear();
    this.combat?.clear();
    this.world?.clear();
    this.activity = undefined;
    this.combat = undefined;
    this.world = undefined;
  }
}
