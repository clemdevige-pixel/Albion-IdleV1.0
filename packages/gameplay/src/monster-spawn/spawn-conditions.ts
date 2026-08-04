import type { MonsterRuntime } from "../monsters/monster-runtime.js";
import type {
  SpawnConditionResult,
  SpawnGroupConfig,
  SpawnPointConfig,
  SpawnPointState,
} from "./spawn-types.js";

/**
 * Pure functions that evaluate whether a spawn point is eligible to spawn.
 */

export function checkPointEnabled(config: SpawnPointConfig): SpawnConditionResult {
  if (!config.enabled) {
    return { ok: false, reason: "point_disabled" };
  }
  return { ok: true };
}

export function checkPointUnoccupied(state: SpawnPointState): SpawnConditionResult {
  if (state.activeInstanceId !== undefined) {
    return { ok: false, reason: "point_occupied" };
  }
  return { ok: true };
}

export function checkRespawnCooldown(
  state: SpawnPointState,
  config: SpawnPointConfig,
  currentTick: number,
): SpawnConditionResult {
  if (state.respawnStartTick !== undefined) {
    const elapsed = currentTick - state.respawnStartTick;
    if (elapsed < config.respawnDelayTicks) {
      return { ok: false, reason: "respawn_cooldown" };
    }
  }
  return { ok: true };
}

export function checkPopulationCap(
  groupConfig: SpawnGroupConfig,
  runtime: MonsterRuntime,
  groupPointStates: ReadonlyMap<string, SpawnPointState>,
): SpawnConditionResult {
  let alive = 0;
  for (const pointState of groupPointStates.values()) {
    if (pointState.activeInstanceId !== undefined) {
      const result = runtime.getInstance(pointState.activeInstanceId);
      if (result.ok && result.value.state === "alive") {
        alive += 1;
      }
    }
  }
  if (alive >= groupConfig.populationCap) {
    return { ok: false, reason: "population_cap_reached" };
  }
  return { ok: true };
}

/**
 * Runs all spawn conditions for a point.
 */
export function evaluateSpawnConditions(
  config: SpawnPointConfig,
  state: SpawnPointState,
  groupConfig: SpawnGroupConfig,
  runtime: MonsterRuntime,
  groupPointStates: ReadonlyMap<string, SpawnPointState>,
  currentTick: number,
): SpawnConditionResult {
  const enabled = checkPointEnabled(config);
  if (!enabled.ok) return enabled;

  const unoccupied = checkPointUnoccupied(state);
  if (!unoccupied.ok) return unoccupied;

  const cooldown = checkRespawnCooldown(state, config, currentTick);
  if (!cooldown.ok) return cooldown;

  const pop = checkPopulationCap(groupConfig, runtime, groupPointStates);
  if (!pop.ok) return pop;

  return { ok: true };
}
