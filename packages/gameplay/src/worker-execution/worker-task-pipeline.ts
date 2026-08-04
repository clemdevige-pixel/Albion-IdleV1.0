import type { EventBus } from "@game/core";
import type { WorkerId } from "../workers/index.js";
import type { WorkerManager } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";
import type { WorkerAssignmentManager } from "../worker-tasks/index.js";
import type { WorkerTaskRegistry } from "../worker-tasks/index.js";
import type { WorkerExecutionEventMap } from "./worker-execution-events.js";
import type { WorkerExecutionResult } from "./worker-execution-types.js";
import { WorkerExecutor, type StartExecutionResult } from "./worker-executor.js";
import type { WorkerSession } from "./worker-session.js";

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class WorkerTaskPipeline {
  readonly #executor: WorkerExecutor;
  readonly #events: EventBus<WorkerExecutionEventMap>;

  constructor(
    workerManager: WorkerManager,
    assignmentManager: WorkerAssignmentManager,
    taskRegistry: WorkerTaskRegistry,
    events: EventBus<WorkerExecutionEventMap>,
  ) {
    this.#executor = new WorkerExecutor(
      workerManager,
      assignmentManager,
      taskRegistry,
      events,
    );
    this.#events = events;
  }

  /** Validate prerequisites and start a session. */
  start(
    workerId: WorkerId,
    taskDefId: WorkerTaskDefinitionId,
  ): StartExecutionResult {
    return this.#executor.startExecution(workerId, taskDefId);
  }

  /** Advance a session by one tick, emitting events. */
  tick(session: WorkerSession): boolean {
    const advanced = session.tick();
    if (!advanced) return false;

    this.#events.publish("workerExec:tick", {
      sessionId: session.id,
      workerId: session.workerId,
      elapsedTicks: session.elapsedTicks,
      totalTicks: session.totalTicks,
    });

    if (session.isComplete()) {
      const result = session.produceResult();
      this.#events.publish("workerExec:completed", {
        sessionId: session.id,
        result,
      });
    }

    return true;
  }

  /** Complete a session and produce the result. */
  complete(session: WorkerSession): WorkerExecutionResult {
    return session.produceResult();
  }
}
