import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";
import type { WorkerSessionId, WorkerExecutionResult } from "./worker-execution-types.js";

export interface WorkerExecutionEventMap {
  "workerExec:started": {
    readonly sessionId: WorkerSessionId;
    readonly workerId: WorkerId;
    readonly taskDefId: WorkerTaskDefinitionId;
  };
  "workerExec:completed": {
    readonly sessionId: WorkerSessionId;
    readonly result: WorkerExecutionResult;
  };
  "workerExec:paused": {
    readonly sessionId: WorkerSessionId;
    readonly workerId: WorkerId;
  };
  "workerExec:resumed": {
    readonly sessionId: WorkerSessionId;
    readonly workerId: WorkerId;
  };
  "workerExec:interrupted": {
    readonly sessionId: WorkerSessionId;
    readonly workerId: WorkerId;
    readonly reason: string;
  };
  "workerExec:failed": {
    readonly sessionId: WorkerSessionId;
    readonly workerId: WorkerId;
    readonly reason: string;
  };
  "workerExec:tick": {
    readonly sessionId: WorkerSessionId;
    readonly workerId: WorkerId;
    readonly elapsedTicks: number;
    readonly totalTicks: number;
  };
}
