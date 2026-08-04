import type { AutomationId } from "./automation-types.js";
import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";

export interface AutomationEventMap {
  "automation:created": { automationId: AutomationId; workerId: WorkerId };
  "automation:started": { automationId: AutomationId };
  "automation:paused": { automationId: AutomationId };
  "automation:stopped": { automationId: AutomationId };
  "automation:taskAdvanced": {
    automationId: AutomationId;
    taskDefId: WorkerTaskDefinitionId;
    index: number;
  };
  "automation:queueEmpty": { automationId: AutomationId };
}
