import type Phaser from "phaser";
import type { GameBridge } from "../../GameBridge";
import { selectActiveGathering } from "./GamePresentationState";
import { ActivityPresentationController } from "./ActivityPresentationController";
import { CombatPresentationController } from "./CombatPresentationController";
import { invalidateCombatPresentation } from "./CombatPresentationInvalidation";
import { clearPresentedEnemyHealth, isPresentedEnemyDefeated, resetPresentedEnemyHealth } from "./CombatPresentedHealth";
import { WorldPresentationController } from "./WorldPresentationController";

export class GamePresentationRuntimeFixed {
  private combat: CombatPresentationController | undefined;
  private activity: ActivityPresentationController | undefined;
  private world: WorldPresentationController | undefined;
  private lastEncounterPresentationKey: string | undefined;

  public constructor(private readonly scene: Phaser.Scene, private readonly getBridge: () => GameBridge | undefined) {}

  public create(): void {
    this.world = new WorldPresentationController(this.scene, this.getBridge());
    this.combat = new CombatPresentationController(this.scene, this.getBridge);
    this.activity = new ActivityPresentationController(this.scene, this.combat);
  }

  public update(): void {
    const bridge = this.getBridge();
    if (bridge === undefined) return;
    const key = [bridge.world.zoneDefId, bridge.world.segmentIndex, bridge.world.encounterIndex].join(":");

    if (this.lastEncounterPresentationKey === undefined) {
      resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      this.lastEncounterPresentationKey = key;
    } else if (key !== this.lastEncounterPresentationKey && isPresentedEnemyDefeated()) {
      this.combat?.update(bridge);
      invalidateCombatPresentation(bridge.damageNumbers.at(-1)?.id ?? 0);
      resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      this.lastEncounterPresentationKey = key;
    }

    const gathering = selectActiveGathering(bridge);
    this.combat?.update(bridge);
    this.activity?.update(gathering);
    this.world?.update(bridge, gathering);
  }

  public clear(): void {
    this.activity?.clear();
    this.combat?.clear();
    this.world?.clear();
    clearPresentedEnemyHealth();
    this.activity = undefined;
    this.combat = undefined;
    this.world = undefined;
    this.lastEncounterPresentationKey = undefined;
  }
}
