export type {
  UnlockConditionType,
  UnlockCondition,
  ZoneUnlockDefinition,
  WorldProgressionState,
  WorldProgressionSaveState,
  UnlockEvaluationContext,
} from "./world-progression-types.js";

export type {
  ZoneUnlockedEvent,
  ZoneCompletedEvent,
  ProgressionStateChangedEvent,
  WorldProgressionEventMap,
} from "./world-progression-events.js";

export { evaluateCondition } from "./unlock-conditions.js";
export { WorldProgressionManager } from "./world-progression-manager.js";
