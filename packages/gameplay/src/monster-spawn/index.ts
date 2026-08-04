export type {
  SpawnPointId,
  SpawnGroupId,
  SpawnPointConfig,
  SpawnGroupConfig,
  SpawnPointState,
  SpawnDeniedReason,
  SpawnConditionResult,
} from "./spawn-types.js";
export { asSpawnPointId, asSpawnGroupId } from "./spawn-types.js";

export type {
  SpawnEventMap,
  MonsterSpawnedByPointEvent,
  MonsterDespawnedByPointEvent,
  SpawnPointRegisteredEvent,
  SpawnGroupRegisteredEvent,
  RespawnTimerStartedEvent,
  RespawnTimerExpiredEvent,
  SpawnDeniedEvent,
} from "./spawn-events.js";

export {
  checkPointEnabled,
  checkPointUnoccupied,
  checkRespawnCooldown,
  checkPopulationCap,
  evaluateSpawnConditions,
} from "./spawn-conditions.js";

export {
  startRespawnTimer,
  clearRespawnTimer,
  isRespawnReady,
  getRemainingCooldownTicks,
} from "./respawn-timer.js";

export { getReadySpawnPoints } from "./spawn-scheduler.js";

export { MonsterSpawnManager } from "./monster-spawn-manager.js";
