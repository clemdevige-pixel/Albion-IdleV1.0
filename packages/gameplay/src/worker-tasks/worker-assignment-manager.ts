import { EventBus } from "@game/core";
import type { WorkerId } from "../workers/index.js";
import type { WorkerManager } from "../workers/index.js";
import type { WorkerTaskEventMap } from "./worker-task-events.js";
import type {
  WorkerAssignment,
  WorkerTaskDefinitionId,
} from "./worker-task-types.js";
import type { WorkerTaskRegistry } from "./worker-task-registry.js";
import { resolveWorkerTask } from "./worker-task-resolver.js";
import { validateAssignment } from "./worker-assignment-validator.js";

export type AssignResult =
  | { readonly ok: true; readonly assignment: WorkerAssignment }
  | { readonly ok: false; readonly reason: string };

export type UnassignResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export class WorkerAssignmentManager {
  readonly events = new EventBus<WorkerTaskEventMap>();

  readonly #assignments = new Map<WorkerId, WorkerAssignment>();
  readonly #workerManager: WorkerManager;
  readonly #taskRegistry: WorkerTaskRegistry;

  constructor(
    workerManager: WorkerManager,
    taskRegistry: WorkerTaskRegistry,
    eventBus?: EventBus<WorkerTaskEventMap>,
  ) {
    this.#workerManager = workerManager;
    this.#taskRegistry = taskRegistry;
    if (eventBus !== undefined) {
      this.events = eventBus;
    }
  }

  assign(workerId: WorkerId, taskDefId: WorkerTaskDefinitionId): AssignResult {
    const worker = this.#workerManager.getWorker(workerId);
    if (worker === undefined) {
      return { ok: false, reason: `Worker not found: ${workerId}` };
    }

    const resolved = resolveWorkerTask(taskDefId, this.#taskRegistry);
    if (!resolved.ok) {
      return { ok: false, reason: resolved.reason };
    }

    if (this.#assignments.has(workerId)) {
      return {
        ok: false,
        reason: "Worker already has an assignment; unassign first or use reassign",
      };
    }

    const validation = validateAssignment(worker, resolved.definition);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    const assignment: WorkerAssignment = {
      workerId,
      taskDefinitionId: taskDefId,
      assignedAt: Date.now(),
      state: "pending",
    };

    this.#assignments.set(workerId, assignment);

    this.events.publish("assignment:created", { assignment });

    return { ok: true, assignment };
  }

  unassign(workerId: WorkerId): UnassignResult {
    const existing = this.#assignments.get(workerId);
    if (existing === undefined) {
      return { ok: false, reason: `No assignment found for worker: ${workerId}` };
    }

    this.#assignments.delete(workerId);

    this.events.publish("assignment:removed", {
      workerId,
      taskDefinitionId: existing.taskDefinitionId,
    });

    return { ok: true };
  }

  reassign(
    workerId: WorkerId,
    newTaskDefId: WorkerTaskDefinitionId,
  ): AssignResult {
    const existing = this.#assignments.get(workerId);
    if (existing === undefined) {
      return { ok: false, reason: `No assignment found for worker: ${workerId}` };
    }

    const worker = this.#workerManager.getWorker(workerId);
    if (worker === undefined) {
      return { ok: false, reason: `Worker not found: ${workerId}` };
    }

    const resolved = resolveWorkerTask(newTaskDefId, this.#taskRegistry);
    if (!resolved.ok) {
      return { ok: false, reason: resolved.reason };
    }

    const validation = validateAssignment(worker, resolved.definition);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    const previousTaskDefId = existing.taskDefinitionId;

    const assignment: WorkerAssignment = {
      workerId,
      taskDefinitionId: newTaskDefId,
      assignedAt: Date.now(),
      state: "pending",
    };

    this.#assignments.set(workerId, assignment);

    this.events.publish("assignment:changed", {
      workerId,
      previousTaskDefinitionId: previousTaskDefId,
      newTaskDefinitionId: newTaskDefId,
    });

    return { ok: true, assignment };
  }

  getAssignment(workerId: WorkerId): WorkerAssignment | undefined {
    return this.#assignments.get(workerId);
  }

  getAllAssignments(): readonly WorkerAssignment[] {
    return [...this.#assignments.values()];
  }
}
