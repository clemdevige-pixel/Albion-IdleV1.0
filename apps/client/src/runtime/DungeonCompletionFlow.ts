import { DUNGEON_DEFINITIONS } from "../data/dungeonContentCatalog.js";
import type { DungeonEncounterRewardResult } from "./DungeonRewardRuntime.js";
import { combatStopController } from "./CombatStopController.js";
import { worldTravelTransition } from "./WorldTravelTransition.js";

export interface DungeonCompletionRewards {
  readonly silver: number;
  readonly artifactFragments: number;
  readonly enchantmentShards: number;
  readonly factionRunes: number;
  readonly artifacts: number;
}

export interface DungeonCompletionRecapModel {
  readonly id: number;
  readonly dungeonDefinitionId: string;
  readonly faction: string;
  readonly tier: number;
  readonly durationMs: number;
  readonly rewards: DungeonCompletionRewards;
}

type Listener = () => void;

interface ActiveDungeonRecap {
  readonly dungeonDefinitionId: string;
  readonly startedAt: number;
  rewards: DungeonCompletionRewards;
}

function emptyRewards(): DungeonCompletionRewards {
  return {
    silver: 0,
    artifactFragments: 0,
    enchantmentShards: 0,
    factionRunes: 0,
    artifacts: 0,
  };
}

/**
 * Owns the post-dungeon lifecycle gate and recap aggregation.
 * Gameplay grants rewards before this flow records them; this module only
 * aggregates presentation data and keeps world combat paused until the player
 * explicitly chooses what happens next.
 */
class DungeonCompletionFlow {
  #active: ActiveDungeonRecap | null = null;
  #recap: DungeonCompletionRecapModel | null = null;
  #nextId = 1;
  readonly #listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  readonly getSnapshot = (): DungeonCompletionRecapModel | null => this.#recap;

  begin(definitionId: string): void {
    this.#active = {
      dungeonDefinitionId: definitionId,
      startedAt: Date.now(),
      rewards: emptyRewards(),
    };
    if (this.#recap !== null) {
      this.#recap = null;
      this.#notify();
    }
  }

  recordReward(reward: DungeonEncounterRewardResult): void {
    const active = this.#active;
    if (active === null || active.dungeonDefinitionId !== reward.dungeonDefinitionId) return;

    let artifactFragments = active.rewards.artifactFragments;
    let enchantmentShards = active.rewards.enchantmentShards;
    let factionRunes = active.rewards.factionRunes;
    let artifacts = active.rewards.artifacts;

    for (const drop of reward.drops) {
      if (drop.kind === "artifact_fragment") artifactFragments += drop.quantity;
      else if (drop.kind === "enchantment_shard") enchantmentShards += drop.quantity;
      else if (drop.kind === "faction_rune") factionRunes += drop.quantity;
      else if (drop.kind === "artifact") artifacts += drop.quantity;
    }

    active.rewards = {
      silver: active.rewards.silver + reward.completionSilver,
      artifactFragments,
      enchantmentShards,
      factionRunes,
      artifacts,
    };
  }

  complete(definitionId: string): boolean {
    const active = this.#active;
    if (active === null || active.dungeonDefinitionId !== definitionId) return false;
    const definition = DUNGEON_DEFINITIONS.find((entry) => entry.id === definitionId);
    if (definition === undefined) return false;

    this.#recap = {
      id: this.#nextId,
      dungeonDefinitionId: definitionId,
      faction: definition.faction,
      tier: definition.tier,
      durationMs: Math.max(0, Date.now() - active.startedAt),
      rewards: active.rewards,
    };
    this.#nextId += 1;
    this.#active = null;
    combatStopController.restorePaused();
    this.#notify();
    return true;
  }

  cancel(): void {
    this.#active = null;
  }

  resumeExploration(): boolean {
    if (this.#recap === null || !combatStopController.isPaused()) return false;
    this.#recap = null;
    combatStopController.resume();
    worldTravelTransition.start();
    this.#notify();
    return true;
  }

  dismissForReplay(): void {
    if (this.#recap === null) return;
    this.#recap = null;
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const dungeonCompletionFlow = new DungeonCompletionFlow();
