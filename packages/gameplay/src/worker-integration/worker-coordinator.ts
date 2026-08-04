import type { EventBus } from "@game/core";
import type { WorkerId, WorkerDefinitionId, WorkerInstance } from "../workers/index.js";
import type { WorkerManager } from "../workers/index.js";
import type {
  WorkerTaskDefinitionId,
  WorkerAssignment,
} from "../worker-tasks/index.js";
import type { WorkerAssignmentManager } from "../worker-tasks/index.js";
import type { WorkerExecutor, WorkerSession } from "../worker-execution/index.js";
import type { WorkerScheduler } from "../worker-execution/index.js";
import type { WorkerIntegrationEventMap } from "./worker-integration-events.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type RecruitAndAssignResult =
  | { readonly ok: true; readonly workerId: WorkerId; readonly assignment: WorkerAssignment }
  | { readonly ok: false; readonly reason: string };

export type ExecuteWorkerTaskResult =
  | { readonly ok: true; readonly session: WorkerSession }
  | { readonly ok: false; readonly reason: string };

export interface WorkerStatus {
  readonly worker: WorkerInstance;
  readonly assignment: WorkerAssignment | undefined;
  readonly session: WorkerSession | undefined;
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export class WorkerCoordinator {
  readonly #workerManager: WorkerManager;
  readonly #assignmentManager: WorkerAssignmentManager;
  readonly #executor: WorkerExecutor;
  readonly #scheduler: WorkerScheduler;
  readonly #events: EventBus<WorkerIntegrationEventMap>;

  constructor(
    workerManager: WorkerManager,
    assignmentManager: WorkerAssignmentManager,
    executor: WorkerExecutor,
    scheduler: WorkerScheduler,
    events: EventBus<WorkerIntegrationEventMap>,
  ) {
    this.#workerManager = workerManager;
    this.#assignmentManager = assignmentManager;
    this.#executor = executor;
    this.#scheduler = scheduler;
    this.#events = events;
  }

  recruitAndAssign(
    defId: WorkerDefinitionId,
    taskDefId: WorkerTaskDefinitionId,
    displayName?: string,
  ): RecruitAndAssignResult {
    const createResult = this.#workerManager.createWorker(defId, displayName);
    if (!createResult.ok) {
      return { ok: false, reason: createResult.reason };
    }

    const worker = createResult.worker;
    const assignResult = this.#assignmentManager.assign(worker.id, taskDefId);
    if (!assignResult.ok) {
      // Rollback: remove the created worker
      this.#workerManager.removeWorker(worker.id);
      return { ok: false, reason: assignResult.reason };
    }

    this.#workerManager.updateState(worker.id, "assigned");

    this.#events.publish("workerIntegration:recruited", {
      workerId: worker.id,
      taskDefId,
      displayName: worker.displayName,
    });

    return { ok: true, workerId: worker.id, assignment: assignResult.assignment };
  }

  executeWorkerTask(workerId: WorkerId): ExecuteWorkerTaskResult {
    const assignment = this.#assignmentManager.getAssignment(workerId);
    if (assignment === undefined) {
      return { ok: false, reason: `No assignment found for worker: ${workerId}` };
    }

    const execResult = this.#executor.startExecution(workerId, assignment.taskDefinitionId);
    if (!execResult.ok) {
      return { ok: false, reason: execResult.reason };
    }

    this.#scheduler.addSession(execResult.session);
    this.#workerManager.updateState(workerId, "working");

    return { ok: true, session: execResult.session };
  }

  tickAll(): void {
    const beforeActive = this.#scheduler.getActiveSessions().length;
    this.#scheduler.tickAll();
    const afterActive = this.#scheduler.getActiveSessions().length;
    const completedCount = beforeActive - afterActive;

    // Emit completion events for sessions that just completed
    for (const session of this.#scheduler.getAllSessions()) {
      if (session.isComplete()) {
        const result = session.produceResult();
        if (result.ok) {
          this.#events.publish("workerIntegration:taskCompleted", {
            workerId: session.workerId,
            sessionId: session.id,
            taskDefId: session.taskDefId,
            yield: result.yield,
            masteryGained: result.masteryGained,
          });
        }
      }
    }

    this.#events.publish("workerIntegration:cycleDone", {
      tickCount: 1,
      activeSessions: afterActive,
      completedSessions: completedCount,
    });
  }

  getWorkerStatus(workerId: WorkerId): WorkerStatus | undefined {
    const worker = this.#workerManager.getWorker(workerId);
    if (worker === undefined) return undefined;

    return {
      worker,
      assignment: this.#assignmentManager.getAssignment(workerId),
      session: this.#scheduler.getSession(workerId),
    };
  }
}
