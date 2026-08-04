import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";
import type { WorkerSessionId } from "../worker-execution/index.js";

export interface WorkerIntegrationEventMap {
  "workerIntegration:recruited": {
    readonly workerId: WorkerId;
    readonly taskDefId: WorkerTaskDefinitionId;
    readonly displayName: string;
  };
  "workerIntegration:taskCompleted": {
    readonly workerId: WorkerId;
    readonly sessionId: WorkerSessionId;
    readonly taskDefId: WorkerTaskDefinitionId;
    readonly yield: number;
    readonly masteryGained: number;
  };
  "workerIntegration:cycleDone": {
    readonly tickCount: number;
    readonly activeSessions: number;
    readonly completedSessions: number;
  };
}
