import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";

export interface AutomationRule {
  canExecute(workerId: WorkerId, taskDefId: WorkerTaskDefinitionId): boolean;
}

export class SimpleAutomationRule implements AutomationRule {
  canExecute(_workerId: WorkerId, _taskDefId: WorkerTaskDefinitionId): boolean {
    return true;
  }
}
