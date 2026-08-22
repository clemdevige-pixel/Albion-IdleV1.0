import { EventBus } from "@game/core";
import type { WorkerEventMap } from "./worker-events.js";
import type {
  WorkerDefinitionId,
  WorkerId,
  WorkerInstance,
  WorkerState,
} from "./worker-types.js";
import { asWorkerId } from "./worker-types.js";
import type { WorkerRegistry } from "./worker-registry.js";
import { resolveWorkerDefinition } from "./worker-resolver.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type WorkerCreateResult =
  | { readonly ok: true; readonly worker: WorkerInstance }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

let workerCounter = 0;

/** @internal — for test cleanup only */
export function _resetWorkerCounter(): void {
  workerCounter = 0;
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export class WorkerManager {
  readonly events = new EventBus<WorkerEventMap>();
  readonly #workers = new Map<WorkerId, WorkerInstance>();
  readonly #registry: WorkerRegistry;

  constructor(registry: WorkerRegistry) {
    this.#registry = registry;
  }

  createWorker(
    definitionId: WorkerDefinitionId,
    displayName?: string,
  ): WorkerCreateResult {
    const resolved = resolveWorkerDefinition(definitionId, this.#registry);
    if (!resolved.ok) {
      return { ok: false, reason: resolved.reason };
    }

    const def = resolved.definition;
    const sameDefinitionCount = [...this.#workers.values()].filter(
      (worker) => worker.definitionId === definitionId,
    ).length;
    const authoredDisplayName = def.displayNames?.[sameDefinitionCount] ?? def.displayName;
    workerCounter += 1;
    const id = asWorkerId(`worker-${workerCounter}`);

    const worker: WorkerInstance = {
      id,
      definitionId: def.id,
      profession: def.profession,
      displayName: displayName ?? authoredDisplayName,
      mastery: 0,
      state: "idle",
      assignedBuildingId: undefined,
      productivityModifiers: {},
    };

    this.#workers.set(id, worker);

    this.events.publish("worker:created", {
      workerId: id,
      definitionId: def.id,
      displayName: worker.displayName,
    });

    return { ok: true, worker };
  }

  getWorker(id: WorkerId): WorkerInstance | undefined {
    return this.#workers.get(id);
  }

  getAllWorkers(): readonly WorkerInstance[] {
    return [...this.#workers.values()];
  }

  getWorkersByProfession(
    profession: string,
  ): readonly WorkerInstance[] {
    return [...this.#workers.values()].filter(
      (w) => w.profession === profession,
    );
  }

  removeWorker(id: WorkerId): boolean {
    const worker = this.#workers.get(id);
    if (worker === undefined) {
      return false;
    }

    this.#workers.delete(id);

    this.events.publish("worker:removed", { workerId: id });

    return true;
  }

  updateState(id: WorkerId, state: WorkerState): boolean {
    const worker = this.#workers.get(id);
    if (worker === undefined) {
      return false;
    }

    const previousState = worker.state;
    worker.state = state;

    this.events.publish("worker:stateChanged", {
      workerId: id,
      previousState,
      newState: state,
    });

    return true;
  }

  addMastery(id: WorkerId, amount: number): boolean {
    const worker = this.#workers.get(id);
    if (worker === undefined) {
      return false;
    }

    worker.mastery += amount;

    this.events.publish("worker:masteryGained", {
      workerId: id,
      amount,
      newMastery: worker.mastery,
    });

    return true;
  }

  clear(): void {
    this.#workers.clear();
  }
}
