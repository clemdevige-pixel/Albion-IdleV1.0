export type {
  MonsterId,
  MonsterDefinitionId,
  MonsterInstanceId,
  MonsterState,
  MonsterStatEntry,
  MonsterDefinition,
  MonsterInstanceData,
  MonsterResult,
  MonsterFailureReason,
} from "./types.js";
export { asMonsterId, asMonsterDefinitionId, asMonsterInstanceId } from "./types.js";

export type {
  MonsterEventMap,
  MonsterSpawnedEvent,
  MonsterStateChangedEvent,
  MonsterDiedEvent,
  MonsterDespawnedEvent,
} from "./monster-events.js";

export { validateMonsterTransition, transitionMonsterState } from "./monster-state-machine.js";

export { MonsterInstance } from "./monster-instance.js";
export { MonsterFactory } from "./monster-factory.js";
export { MonsterRepository } from "./monster-repository.js";
export { MonsterRuntime } from "./monster-runtime.js";
