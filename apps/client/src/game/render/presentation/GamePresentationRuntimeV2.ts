import type Phaser from "phaser";
import type { GameBridge } from "../../GameBridge";
import { worldTravelTransition } from "../../../runtime/WorldTravelTransition";
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
import { resolveCombatPresentationTransition } from "./CombatPresentationTransition";
import { WorldPresentationController } from "./WorldPresentationController";
import { WorldTravelPresentationController } from "./WorldTravelPresentationController";

/** Thin coordinator for the specialized presentation controllers. */
export class GamePresentationRuntime {
  private combat: CombatPresentationController | undefined;
  private activity: ActivityPresentationController | undefined;
  private world: WorldPresentationController | undefined;
  private travel: WorldTravelPresentationController | undefined;
  private lastEncounterPresentationKey: string | undefined;
  private lastCombatState: GameBridge["combatState"] | undefined;
  private lastTravelGeneration = 0;
  private awaitingCombatAfterTravel = false;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly getBridge: () => GameBridge | undefined,
  ) {}

  public create(): void {
    const bridge = this.getBridge();
    resetCombatPresentationSession(bridge?.damageNumbers.at(-1)?.id ?? 0);
    const world = new WorldPresentationController(this.scene, bridge);
    const combat = new CombatPresentationController(this.scene, this.getBridge);
    this.world = world;
    this.combat = combat;
    this.activity = new ActivityPresentationController(this.scene, combat);
    this.travel = new WorldTravelPresentationController(this.scene, combat, world);
    this.lastTravelGeneration = worldTravelTransition.getGeneration();
  }

  public update(): void {
    const bridge = this.getBridge();
    if (bridge === undefined) return;

    const gathering = selectActiveGathering(bridge);
    const travelGeneration = worldTravelTransition.getGeneration();
    const authoritativeTravelStarted = travelGeneration !== this.lastTravelGeneration
      && worldTravelTransition.isActive();
    if (authoritativeTravelStarted && gathering === undefined) {
      this.awaitingCombatAfterTravel = true;
      this.travel?.start();
    }
    this.lastTravelGeneration = travelGeneration;

    const encounterPresentationKey = bridge.enemyEncounterKey;
    const transition = resolveCombatPresentationTransition({
      previousCombatState: this.lastCombatState,
      nextCombatState: bridge.combatState,
      previousEncounterKey: this.lastEncounterPresentationKey,
      nextEncounterKey: encounterPresentationKey,
    });

    if (transition === "initialize") {
      if (this.hasAuthoritativeEnemySnapshot(bridge)) {
        resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      } else {
        clearPresentedEnemyHealth();
      }
      this.lastEncounterPresentationKey = encounterPresentationKey;
    } else if (transition === "hard_reset") {
      const latestDamageEventId = bridge.damageNumbers.at(-1)?.id ?? 0;
      invalidateCombatPresentation(latestDamageEventId);
      this.combat?.invalidateEncounterPresentation();
      if (
        !worldTravelTransition.isActive()
        && this.travel?.isActive() !== true
        && bridge.combatState === "combat"
        && this.hasAuthoritativeEnemySnapshot(bridge)
      ) {
        resetPresentedEnemyHealth(bridge.enemyHealth, bridge.enemyMaxHealth);
      }
      this.lastEncounterPresentationKey = encounterPresentationKey;
    } else if (transition === "victory_handoff") {
      this.lastEncounterPresentationKey = encounterPresentationKey;
    }

    const travelActive = worldTravelTransition.isActive()
      || this.travel?.isActive() === true;
    const arrivalHold = this.awaitingCombatAfterTravel
      && !travelActive
      && bridge.combatState === "walking";

    if (this.awaitingCombatAfterTravel && bridge.combatState !== "walking") {
      this.awaitingCombatAfterTravel = false;
    }

    if (!travelActive && !arrivalHold) this.combat?.update(bridge);
    this.activity?.update(gathering);
    this.world?.update(bridge, gathering);
    this.lastCombatState = bridge.combatState;
  }

  public clear(): void {
    this.travel?.clear();
    this.activity?.clear();
    this.combat?.clear();
    this.world?.clear();
    clearPresentedEnemyHealth();
    this.travel = undefined;
    this.activity = undefined;
    this.combat = undefined;
    this.world = undefined;
    this.lastEncounterPresentationKey = undefined;
    this.lastCombatState = undefined;
    this.lastTravelGeneration = worldTravelTransition.getGeneration();
    this.awaitingCombatAfterTravel = false;
  }

  private hasAuthoritativeEnemySnapshot(bridge: GameBridge): boolean {
    return bridge.enemyEncounterKey.length > 0
      && bridge.enemyName.length > 0
      && bridge.enemyVisualManifestId.length > 0
      && bridge.enemyMaxHealth > 0;
  }
}
