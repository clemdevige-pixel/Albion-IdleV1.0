import type { DungeonRuntime } from "@game/gameplay";
import type { FactionCombatContext } from "../data/factionCombatResolver.js";
import type {
  CombatEntityFactoryDependencies,
  SpawnedEnemyResult,
} from "./combatEntityFactory.js";
import {
  CONTINUOUS_COMBAT_FLOW_POLICY,
  WORLD_COMBAT_FLOW_POLICY,
  type CombatFlowPolicy,
} from "./CombatFlowPolicy.js";
import type { DungeonCombatEncounterSource } from "./DungeonCombatEncounterSource.js";
import { dungeonCompletionFlow } from "./DungeonCompletionFlow.js";

export interface CombatVictoryResult {
  readonly enteredNewSegment: boolean;
}

/**
 * Routes the existing combat runtime between world exploration and an active
 * dungeon attempt. It deliberately owns no combat, loot, health or cooldown
 * state; those remain in their existing systems.
 */
export class DungeonCombatRuntimeRouter {
  readonly flowPolicy: CombatFlowPolicy;
  private restoreHealthOnNextWorldEncounter = false;

  constructor(
    private readonly dungeonRuntime: DungeonRuntime,
    private readonly encounterSource: DungeonCombatEncounterSource,
  ) {
    this.flowPolicy = {
      shouldRestoreHeroHealthBeforeEncounter: (context) => {
        if (this.isDungeonActive()) {
          this.restoreHealthOnNextWorldEncounter = true;
          return CONTINUOUS_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter(context);
        }
        if (this.restoreHealthOnNextWorldEncounter) {
          this.restoreHealthOnNextWorldEncounter = false;
          return true;
        }
        return WORLD_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter(context);
      },
      shouldResetHeroCooldownsOnEncounterStart: (context) => (
        this.isDungeonActive()
          ? CONTINUOUS_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart(context)
          : WORLD_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart(context)
      ),
    };
  }

  isDungeonActive(): boolean {
    return this.dungeonRuntime.activeRun?.status === "active";
  }

  getFactionCombatContext(): FactionCombatContext | undefined {
    const run = this.dungeonRuntime.activeRun;
    if (run?.status !== "active") return undefined;
    const dungeon = this.dungeonRuntime.getDefinition(run.definitionId);
    if (dungeon === undefined) return undefined;
    return { factionId: dungeon.faction, tier: dungeon.tier };
  }

  spawnEnemyOverride(
    deps: CombatEntityFactoryDependencies,
  ): SpawnedEnemyResult | undefined {
    if (!this.isDungeonActive()) return undefined;
    return this.encounterSource.spawnCurrentEncounter(deps);
  }

  getEncounterIndex(worldEncounterIndex: number): number {
    return this.isDungeonActive()
      ? this.dungeonRuntime.activeRun?.encounterIndex ?? worldEncounterIndex
      : worldEncounterIndex;
  }

  onVictory(worldVictory: () => CombatVictoryResult): CombatVictoryResult {
    if (!this.isDungeonActive()) {
      const result = worldVictory();
      if (result.enteredNewSegment) this.restoreHealthOnNextWorldEncounter = true;
      return result;
    }
    this.restoreHealthOnNextWorldEncounter = true;
    const run = this.dungeonRuntime.activeRun;
    const encounter = this.dungeonRuntime.getActiveEncounter();
    if (run === undefined || encounter === undefined) return { enteredNewSegment: false };
    const definitionId = run.definitionId;
    const result = this.dungeonRuntime.completeEncounter(encounter.id);
    if (result.ok && result.state.status === "cleared") {
      dungeonCompletionFlow.complete(definitionId);
    }
    return { enteredNewSegment: false };
  }

  onDefeat(worldDefeat: () => void): void {
    if (!this.isDungeonActive()) {
      worldDefeat();
      return;
    }
    this.restoreHealthOnNextWorldEncounter = true;
    const run = this.dungeonRuntime.activeRun;
    if (run?.status === "active") {
      dungeonCompletionFlow.fail(run.definitionId, run.encounterIndex);
    }
    this.dungeonRuntime.fail();
  }
}
