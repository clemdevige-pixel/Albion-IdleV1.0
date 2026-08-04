import type { SpawnPointConfig, SpawnPointState } from "./spawn-types.js";

/**
 * Pure helper to manage respawn timing logic.
 */
export function startRespawnTimer(
  _state: SpawnPointState,
  currentTick: number,
): SpawnPointState {
  return {
    activeInstanceId: undefined,
    respawnStartTick: currentTick,
  };
}

export function clearRespawnTimer(state: SpawnPointState): SpawnPointState {
  return {
    activeInstanceId: state.activeInstanceId,
    respawnStartTick: undefined,
  };
}

export function isRespawnReady(
  state: SpawnPointState,
  config: SpawnPointConfig,
  currentTick: number,
): boolean {
  if (state.respawnStartTick === undefined) {
    // No timer running — ready only if point is unoccupied
    return state.activeInstanceId === undefined;
  }
  const elapsed = currentTick - state.respawnStartTick;
  return elapsed >= config.respawnDelayTicks;
}

export function getRemainingCooldownTicks(
  state: SpawnPointState,
  config: SpawnPointConfig,
  currentTick: number,
): number {
  if (state.respawnStartTick === undefined) {
    return 0;
  }
  const elapsed = currentTick - state.respawnStartTick;
  return Math.max(0, config.respawnDelayTicks - elapsed);
}
