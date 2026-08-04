export type {
  AutomationId,
  AutomationState,
  AutomationQueueEntry,
  AutomationConfig,
  AutomationInstance,
} from "./automation-types.js";
export {
  asAutomationId,
  nextAutomationId,
  _resetAutomationCounter,
} from "./automation-types.js";

export type { AutomationEventMap } from "./automation-events.js";

export { AutomationQueue } from "./automation-queue.js";

export type { AutomationRule } from "./automation-rules.js";
export { SimpleAutomationRule } from "./automation-rules.js";

export type { ResolveNextTaskResult } from "./automation-resolver.js";
export { resolveNextTask } from "./automation-resolver.js";

export type { CreateAutomationResult } from "./automation-manager.js";
export { AutomationManager } from "./automation-manager.js";
