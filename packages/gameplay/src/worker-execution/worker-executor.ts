import type { EventBus } from "@game/core";
import type { WorkerId } from "../workers/index.js";
import type { WorkerManager } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";
import type { WorkerAssignmentManager } from "../worker-tasks/index.js";
import type { WorkerTaskRegistry } from "../worker-tasks/index.js";
import type { WorkerExecutionEventMap } from "./worker-execution-events.js";
import type { WorkerSessionConfig } from "./worker-execution-types.js";
import { asWorkerSessionId } from "./worker-execution-types.js";
import { WorkerSession } from "./worker-session.js";

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type StartExecutionResult =
  | { readonly ok: true; readonly session: WorkerSession }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

let sessionCounter = 0;

/** @internal -- for test cleanup only */
export function _resetSessionCounter(): void {
  sessionCounter = 0;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export class WorkerExecutor {
  readonly #workerManager: WorkerManager;
  readonly #assignmentManager: WorkerAssignmentManager;
  readonly #taskRegistry: WorkerTaskRegistry;
  readonly #events: EventBus<WorkerExecutionEventMap>;

  constructor(
    workerManager: WorkerManager,
    assignmentManager: WorkerAssignmentManager,
    taskRegistry: WorkerTaskRegistry,
    events: EventBus<WorkerExecutionEventMap>,
  ) {
    this.#workerManager = workerManager;
    this.#assignmentManager = assignmentManager;
    this.#taskRegistry = taskRegistry;
    this.#events = events;
  }

  startExecution(
    workerId: WorkerId,
    taskDefId: WorkerTaskDefinitionId,
    speedModifier = 1,
  ): StartExecutionResult {
    // Validate worker exists
    const worker = this.#workerManager.getWorker(workerId);
    if (worker === undefined) {
      return { ok: false, reason: `Worker not found: ${workerId}` };
    }

    // Validate assignment exists and matches
    const assignment = this.#assignmentManager.getAssignment(workerId);
    if (assignment === undefined) {
      return { ok: false, reason: `No assignment found for worker: ${workerId}` };
    }
    if (assignment.taskDefinitionId !== taskDefId) {
      return {
        ok: false,
        reason: `Assignment mismatch: worker assigned to ${assignment.taskDefinitionId}, not ${taskDefId}`,
      };
    }

    // Validate task definition exists
    const taskDef = this.#taskRegistry.get(taskDefId);
    if (taskDef === undefined) {
      return { ok: false, reason: `Task definition not found: ${taskDefId}` };
    }

    // Create session
    sessionCounter += 1;
    const sessionId = asWorkerSessionId(`session-${sessionCounter}`);

    const config: WorkerSessionConfig = {
      baseDurationTicks: taskDef.durationTicks,
      speedModifier: Math.max(0.01, speedModifier),
      yieldModifier: taskDef.baseYield,
    };

    const session = new WorkerSession(sessionId, workerId, taskDefId, config);
    session.start();

    this.#events.publish("workerExec:started", {
      sessionId,
      workerId,
      taskDefId,
    });

    return { ok: true, session };
  }
}
