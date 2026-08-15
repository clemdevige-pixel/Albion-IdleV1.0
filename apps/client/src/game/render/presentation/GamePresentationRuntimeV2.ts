import type Phaser from "phaser";
import type { GameBridge } from "../../GameBridge";
import { selectActiveGathering } from "./GamePresentationState";
import { ActivityPresentationController } from "./ActivityPresentationController";
import { CombatPresentationController } from "./CombatPresentationController";
import {
  invalidateCombatPresentation,
  resetCombatPresentationSession,
} from "./CombatPresentationInvalidation";
import {
  clearPresentedEnemyHealth,
  resetPresentedEnemyHealth,
} from "./CombatPresentedHealth";
import { WorldPresentationController } from "./WorldPresentationController";

/** Thin coordinator for the specialized presentation controllers. */
export class GamePresentationRuntime {
  private combat: CombatPresentationController | undefined;
  private activity: ActivityPresentationController | undefined;
  private world: WorldPresentationController | undefined;
  private lastEncounterPresentationKey: string | undefined;
  private lastCombatState: GameBridge["combatState"] | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBridge: () => GameBridge | undefined,
  ) {}

  public create(): void {
    const bridge = this.getBridge();
    resetCombatPresentationSession(bridge?.damageNumbers.at(-1)?.id ?? 0);
    this.world = new WorldPresentationController(this.scene, bridge);
    this.combat = new CombatPresentationController(this.scene, this.getBridge);
    this.activity = new ActivityPresentationController(this.scene, this.combat);
  }

  public update(): void {
    const bridge = this.getBridge();
    if (bridge === undefined) return;

    const encounterPresentationKey = [
      bridge.world.zoneDefId,
      bridge.world.segmentIndex,
      bridge.world.encounterIndex,
    ].join(":");
    const enteredCombat = bridge.combatState === "combat"
      && this.lastCombatState !== undefined
      && this.lastCombatState !== "combat";
    const encounterKeyChanged = this.lastEncounterPresentationKey !== undefined
      && encounterPresentationKey !== this.lastEncounterPresentationKey;

    if (this.lastEncounterPresentationKey === undefined) {
      resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      this.lastEncounterPresentationKey = encounterPresentationKey;
    } else if (encounterKeyChanged || enteredCombat) {
      // A presentation encounter boundary is not always a world-index change:
      // defeat/resume retries the same encounter and stop/resume may also restart
      // combat without changing zone/segment/encounter. In both cases the bridge
      // already contains the newly spawned enemy and its full health.
      //
      // Invalidate delayed impacts/projectiles from the previous encounter before
      // resetting presentation health so stale visuals can never damage the new
      // health bar.
      const latestDamageEventId = bridge.damageNumbers.at(-1)?.id ?? 0;
      invalidateCombatPresentation(latestDamageEventId);
      resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      this.lastEncounterPresentationKey = encounterPresentationKey;
    }

    const gathering = selectActiveGathering(bridge);
    this.combat?.update(bridge);
    this.activity?.update(gathering);
    this.world?.update(bridge, gathering);
    this.lastCombatState = bridge.combatState;
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
    this.lastCombatState = undefined;
  }
}
