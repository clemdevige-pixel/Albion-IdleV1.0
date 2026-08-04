import { describe, it, expect, beforeEach } from "vitest";
import { WorkerTaskRegistry } from "../worker-tasks/worker-task-registry.js";
import { resolveWorkerTask } from "../worker-tasks/worker-task-resolver.js";
import { validateAssignment } from "../worker-tasks/worker-assignment-validator.js";
import { WorkerAssignmentManager } from "../worker-tasks/worker-assignment-manager.js";
import { asWorkerTaskDefinitionId } from "../worker-tasks/worker-task-types.js";
import type {
  WorkerTaskDefinition,
  WorkerTaskDefinitionId,
} from "../worker-tasks/worker-task-types.js";
import { WorkerRegistry } from "../workers/worker-registry.js";
import { WorkerManager, _resetWorkerCounter } from "../workers/worker-manager.js";
import { asWorkerId, asWorkerDefinitionId } from "../workers/worker-types.js";
import type { WorkerInstance } from "../workers/worker-types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTaskDef(
  overrides: Partial<WorkerTaskDefinition> & { id: WorkerTaskDefinitionId },
): WorkerTaskDefinition {
  return {
    displayName: "Test Task",
    category: "gathering",
    requiredProfession: "woodcutter",
    durationTicks: 10,
    baseYield: 5,
    resourceTier: 1,
    tags: [],
    ...overrides,
  };
}

const WOOD_TASK_ID = asWorkerTaskDefinitionId("gather-wood-t1");
const STONE_TASK_ID = asWorkerTaskDefinitionId("gather-stone-t1");
const WOOD_DEF_ID = asWorkerDefinitionId("woodcutter-def");
const STONE_DEF_ID = asWorkerDefinitionId("stonecutter-def");

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("WorkerTaskRegistry", () => {
  let registry: WorkerTaskRegistry;

  beforeEach(() => {
    registry = new WorkerTaskRegistry();
  });

  it("registers and retrieves a task definition", () => {
    const def = makeTaskDef({ id: WOOD_TASK_ID });
    registry.register(def);
    expect(registry.get(WOOD_TASK_ID)).toBe(def);
    expect(registry.has(WOOD_TASK_ID)).toBe(true);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(WOOD_TASK_ID)).toBeUndefined();
    expect(registry.has(WOOD_TASK_ID)).toBe(false);
  });

  it("getAll returns all definitions", () => {
    const a = makeTaskDef({ id: WOOD_TASK_ID });
    const b = makeTaskDef({
      id: STONE_TASK_ID,
      category: "gathering",
      requiredProfession: "stonecutter",
    });
    registry.register(a);
    registry.register(b);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("filters by category", () => {
    registry.register(makeTaskDef({ id: WOOD_TASK_ID, category: "gathering" }));
    registry.register(
      makeTaskDef({
        id: asWorkerTaskDefinitionId("craft-plank"),
        category: "crafting",
        requiredProfession: "woodcutter",
      }),
    );
    expect(registry.getByCategory("gathering")).toHaveLength(1);
    expect(registry.getByCategory("crafting")).toHaveLength(1);
  });

  it("filters by profession", () => {
    registry.register(
      makeTaskDef({ id: WOOD_TASK_ID, requiredProfession: "woodcutter" }),
    );
    registry.register(
      makeTaskDef({
        id: STONE_TASK_ID,
        requiredProfession: "stonecutter",
      }),
    );
    expect(registry.getByProfession("woodcutter")).toHaveLength(1);
    expect(registry.getByProfession("miner")).toHaveLength(0);
  });

  it("clear removes all", () => {
    registry.register(makeTaskDef({ id: WOOD_TASK_ID }));
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

describe("resolveWorkerTask", () => {
  it("resolves existing task", () => {
    const registry = new WorkerTaskRegistry();
    const def = makeTaskDef({ id: WOOD_TASK_ID });
    registry.register(def);
    const result = resolveWorkerTask(WOOD_TASK_ID, registry);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition).toBe(def);
    }
  });

  it("fails for unknown task", () => {
    const registry = new WorkerTaskRegistry();
    const result = resolveWorkerTask(WOOD_TASK_ID, registry);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

describe("validateAssignment", () => {
  const taskDef = makeTaskDef({
    id: WOOD_TASK_ID,
    requiredProfession: "woodcutter",
  });

  function fakeWorker(overrides: Partial<WorkerInstance>): WorkerInstance {
    return {
      id: asWorkerId("w1"),
      definitionId: WOOD_DEF_ID,
      profession: "woodcutter",
      displayName: "Test",
      mastery: 0,
      state: "idle",
      assignedBuildingId: undefined,
      productivityModifiers: {},
      ...overrides,
    };
  }

  it("accepts matching profession and idle state", () => {
    const result = validateAssignment(fakeWorker({}), taskDef);
    expect(result.ok).toBe(true);
  });

  it("accepts assigned state", () => {
    const result = validateAssignment(fakeWorker({ state: "assigned" }), taskDef);
    expect(result.ok).toBe(true);
  });

  it("rejects inactive worker", () => {
    const result = validateAssignment(fakeWorker({ state: "inactive" }), taskDef);
    expect(result.ok).toBe(false);
  });

  it("rejects working worker", () => {
    const result = validateAssignment(fakeWorker({ state: "working" }), taskDef);
    expect(result.ok).toBe(false);
  });

  it("rejects mismatching profession", () => {
    const result = validateAssignment(
      fakeWorker({ profession: "miner" }),
      taskDef,
    );
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Assignment Manager
// ---------------------------------------------------------------------------

describe("WorkerAssignmentManager", () => {
  let workerRegistry: WorkerRegistry;
  let workerManager: WorkerManager;
  let taskRegistry: WorkerTaskRegistry;
  let manager: WorkerAssignmentManager;

  beforeEach(() => {
    _resetWorkerCounter();
    workerRegistry = new WorkerRegistry();
    workerRegistry.register({
      id: WOOD_DEF_ID,
      displayName: "Woodcutter",
      profession: "woodcutter",
      baseMasteryGainRate: 1,
      tags: [],
    });
    workerRegistry.register({
      id: STONE_DEF_ID,
      displayName: "Stonecutter",
      profession: "stonecutter",
      baseMasteryGainRate: 1,
      tags: [],
    });

    workerManager = new WorkerManager(workerRegistry);
    taskRegistry = new WorkerTaskRegistry();
    taskRegistry.register(
      makeTaskDef({ id: WOOD_TASK_ID, requiredProfession: "woodcutter" }),
    );
    taskRegistry.register(
      makeTaskDef({
        id: STONE_TASK_ID,
        requiredProfession: "stonecutter",
      }),
    );

    manager = new WorkerAssignmentManager(workerManager, taskRegistry);
  });

  it("assigns a worker to a task", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    const result = manager.assign(worker.id, WOOD_TASK_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assignment.workerId).toBe(worker.id);
      expect(result.assignment.state).toBe("pending");
    }
  });

  it("rejects assignment for unknown worker", () => {
    const result = manager.assign("nope" as WorkerInstance["id"], WOOD_TASK_ID);
    expect(result.ok).toBe(false);
  });

  it("rejects assignment for unknown task", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    const result = manager.assign(
      worker.id,
      asWorkerTaskDefinitionId("nonexistent"),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects assignment with mismatching profession", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    const result = manager.assign(worker.id, STONE_TASK_ID);
    expect(result.ok).toBe(false);
  });

  it("rejects double assignment", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(worker.id, WOOD_TASK_ID);
    const result = manager.assign(worker.id, WOOD_TASK_ID);
    expect(result.ok).toBe(false);
  });

  it("unassigns a worker", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(worker.id, WOOD_TASK_ID);
    const result = manager.unassign(worker.id);
    expect(result.ok).toBe(true);
    expect(manager.getAssignment(worker.id)).toBeUndefined();
  });

  it("unassign fails when no assignment", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    const result = manager.unassign(worker.id);
    expect(result.ok).toBe(false);
  });

  it("reassigns a worker to a different task", () => {
    const { worker } = workerManager.createWorker(STONE_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(worker.id, STONE_TASK_ID);
    // Register a second stone task
    const stoneTask2 = asWorkerTaskDefinitionId("gather-stone-t2");
    taskRegistry.register(
      makeTaskDef({
        id: stoneTask2,
        requiredProfession: "stonecutter",
        resourceTier: 2,
      }),
    );
    const result = manager.reassign(worker.id, stoneTask2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assignment.taskDefinitionId).toBe(stoneTask2);
    }
  });

  it("getAllAssignments returns all", () => {
    const { worker: w1 } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    const { worker: w2 } = workerManager.createWorker(STONE_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(w1.id, WOOD_TASK_ID);
    manager.assign(w2.id, STONE_TASK_ID);
    expect(manager.getAllAssignments()).toHaveLength(2);
  });

  it("emits assignment:created event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("assignment:created", (e) => events.push(e));
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(worker.id, WOOD_TASK_ID);
    expect(events).toHaveLength(1);
  });

  it("emits assignment:removed event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("assignment:removed", (e) => events.push(e));
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(worker.id, WOOD_TASK_ID);
    manager.unassign(worker.id);
    expect(events).toHaveLength(1);
  });

  it("emits assignment:changed event on reassign", () => {
    const events: unknown[] = [];
    manager.events.subscribe("assignment:changed", (e) => events.push(e));
    const { worker } = workerManager.createWorker(STONE_DEF_ID) as { ok: true; worker: WorkerInstance };
    manager.assign(worker.id, STONE_TASK_ID);
    const stoneTask2 = asWorkerTaskDefinitionId("gather-stone-t2");
    taskRegistry.register(
      makeTaskDef({ id: stoneTask2, requiredProfession: "stonecutter" }),
    );
    manager.reassign(worker.id, stoneTask2);
    expect(events).toHaveLength(1);
  });

  it("rejects assignment when worker is inactive", () => {
    const { worker } = workerManager.createWorker(WOOD_DEF_ID) as { ok: true; worker: WorkerInstance };
    workerManager.updateState(worker.id, "inactive");
    const result = manager.assign(worker.id, WOOD_TASK_ID);
    expect(result.ok).toBe(false);
  });
});
