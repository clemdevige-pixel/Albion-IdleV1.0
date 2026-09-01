import { getTowerFloorDefinition, type TowerProgressionService } from "@game/gameplay";
import type { FactionCombatContext } from "../data/factionCombatResolver.js";
import { activityFailureFlow } from "./ActivityFailureFlow.js";
import {
  CONTINUOUS_COMBAT_FLOW_POLICY,
  type CombatFlowPolicy,
} from "./CombatFlowPolicy.js";
import type {
  CombatEntityFactoryDependencies,
  SpawnedEnemyResult,
} from "./combatEntityFactory.js";
import { towerBlockCompletionFlow } from "./TowerBlockCompletionFlow.js";
import type { TowerCombatEncounterSource } from "./TowerCombatEncounterSource.js";
import { resolveTowerRewardBreakdown } from "./TowerRewardRuntime.js";

export interface TowerVictoryResult {
  readonly enteredNewSegment: boolean;
}

export interface TowerBlockTransitionPort {
  readonly requestPauseAfterEncounter: () => boolean;
}

/**
 * Runtime-only Tower activity router.
 *
 * Combat-active and between-block preparation are distinct transient states.
 * Persistent floor, checkpoint and Endless progression remain owned by
 * TowerProgressionService. Intermission keeps the player in the Tower context
 * while shared combat stays inactive so equipment can be changed safely.
 */
export class TowerCombatRuntimeRouter {
  readonly flowPolicy: CombatFlowPolicy = CONTINUOUS_COMBAT_FLOW_POLICY;
  private active = false;
  private intermission = false;

  public constructor(
    private readonly progression: TowerProgressionService,
    private readonly encounterSource: TowerCombatEncounterSource,
    private readonly blockTransitionPort?: TowerBlockTransitionPort,
  ) {}

  public isTowerActive(): boolean {
    return this.active;
  }

  public isTowerIntermission(): boolean {
    return this.intermission;
  }

  public isTowerEngaged(): boolean {
    return this.active || this.intermission;
  }

  public getFactionCombatContext(): FactionCombatContext | undefined {
    if (!this.active) return undefined;
    const snapshot = this.progression.getSnapshot();
    const floor = getTowerFloorDefinition(snapshot.currentFloor, snapshot.seed);
    return {
      factionId: floor.block.factionId,
      tier: floor.block.tier,
    };
  }

  public start(): boolean {
    if (this.active) return false;
    this.intermission = false;
    this.active = true;
    return true;
  }

  public abandon(): boolean {
    if (!this.active && !this.intermission) return false;
    this.active = false;
    this.intermission = false;
    return true;
  }

  public spawnEnemyOverride(
    deps: CombatEntityFactoryDependencies,
  ): SpawnedEnemyResult | undefined {
    if (!this.active) return undefined;
    return this.encounterSource.spawnCurrentFloor(deps);
  }

  public getEncounterIndex(worldEncounterIndex: number): number {
    if (!this.active) return worldEncounterIndex;
    return (this.progression.getSnapshot().currentFloor - 1) % 5;
  }

  public onVictory(fallback: () => TowerVictoryResult): TowerVictoryResult {
    if (!this.active) return fallback();
    const before = this.progression.getSnapshot();
    const completedFloor = getTowerFloorDefinition(before.currentFloor, before.seed);
    const reward = resolveTowerRewardBreakdown(before);
    const result = this.progression.clearCurrentFloor(completedFloor.floor);
    if (result.checkpointAdvanced) {
      const after = this.progression.getSnapshot();
      const nextFloor = getTowerFloorDefinition(after.currentFloor, after.seed);
      this.active = false;
      this.intermission = true;
      towerBlockCompletionFlow.show({
        blockIndex: completedFloor.block.blockIndex,
        floorStart: completedFloor.block.floorStart,
        floorEnd: completedFloor.block.floorEnd,
        tier: completedFloor.block.tier,
        factionId: completedFloor.block.factionId,
        finalFloorSilver: reward.baseSilver,
        repeatableBlockChestSilver: reward.repeatableBlockChestSilver,
        firstClearBlockBonusSilver: reward.firstClearBlockBonusSilver,
        majorBossFirstClearBonusSilver: reward.majorBossFirstClearBonusSilver,
        checkpointFloor: after.checkpointFloor,
        nextFloor: nextFloor.floor,
        nextTier: nextFloor.block.tier,
        nextFactionId: nextFloor.block.factionId,
        endlessUnlocked: after.endlessUnlocked,
        unlockedEndlessNow: !before.endlessUnlocked && after.endlessUnlocked,
      });
      this.blockTransitionPort?.requestPauseAfterEncounter();
    }
    return { enteredNewSegment: result.checkpointAdvanced };
  }

  public onDefeat(fallback: () => void): void {
    if (!this.active) {
      fallback();
      return;
    }
    const snapshot = this.progression.getSnapshot();
    const failedFloor = getTowerFloorDefinition(snapshot.currentFloor, snapshot.seed);
    this.progression.failCurrentFloor();
    this.active = false;
    this.intermission = false;
    activityFailureFlow.showTower({
      floor: failedFloor.floor,
      tier: failedFloor.block.tier,
      factionId: failedFloor.block.factionId,
      highestClearedFloor: snapshot.highestClearedFloor,
      checkpointFloor: snapshot.checkpointFloor,
    });
  }
}
