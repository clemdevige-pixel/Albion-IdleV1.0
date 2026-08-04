import type { SpawnPointConfig, SpawnPointId, SpawnPointState } from "./spawn-types.js";
import { isRespawnReady } from "./respawn-timer.js";

/**
 * Determines which spawn points are ready to spawn on this tick.
 * Pure function — no side effects.
 */
export function getReadySpawnPoints(
  configs: ReadonlyMap<SpawnPointId, SpawnPointConfig>,
  states: ReadonlyMap<SpawnPointId, SpawnPointState>,
  currentTick: number,
): readonly SpawnPointId[] {
  const ready: SpawnPointId[] = [];

  for (const [pointId, config] of configs) {
    if (!config.enabled) continue;

    const state = states.get(pointId);
    if (state === undefined) continue;

    if (isRespawnReady(state, config, currentTick)) {
      ready.push(pointId);
    }
  }

  return ready;
}
