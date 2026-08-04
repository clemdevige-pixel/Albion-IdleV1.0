import { describe, it, expect, beforeEach } from "vitest";
import { WorkerRegistry } from "../workers/worker-registry.js";
import {
  WorkerManager,
  _resetWorkerCounter,
} from "../workers/worker-manager.js";
import { resolveWorkerDefinition } from "../workers/worker-resolver.js";
import { asWorkerDefinitionId, asWorkerId } from "../workers/worker-types.js";
import type { WorkerDefinition } from "../workers/worker-types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDef(
  overrides?: Partial<WorkerDefinition>,
): WorkerDefinition {
  return {
    id: asWorkerDefinitionId("def-woodcutter-1"),
    displayName: "Woodcutter",
    profession: "woodcutter",
    baseMasteryGainRate: 1,
    tags: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WorkerRegistry
// ---------------------------------------------------------------------------

describe("WorkerRegistry", () => {
  let registry: WorkerRegistry;

  beforeEach(() => {
    registry = new WorkerRegistry();
  });

  it("registers and retrieves a definition", () => {
    const def = makeDef();
    registry.register(def);
    expect(registry.get(def.id)).toBe(def);
    expect(registry.has(def.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    const def = makeDef();
    registry.register(def);
    expect(() => registry.register(def)).toThrow("already registered");
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asWorkerDefinitionId("nope"))).toBeUndefined();
    expect(registry.has(asWorkerDefinitionId("nope"))).toBe(false);
  });

  it("getAll returns all definitions", () => {
    const d1 = makeDef({ id: asWorkerDefinitionId("d1") });
    const d2 = makeDef({
      id: asWorkerDefinitionId("d2"),
      profession: "miner",
    });
    registry.register(d1);
    registry.register(d2);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("getByProfession filters correctly", () => {
    const d1 = makeDef({ id: asWorkerDefinitionId("d1"), profession: "miner" });
    const d2 = makeDef({
      id: asWorkerDefinitionId("d2"),
      profession: "woodcutter",
    });
    registry.register(d1);
    registry.register(d2);
    expect(registry.getByProfession("miner")).toHaveLength(1);
    expect(registry.getByProfession("miner")[0]!.id).toBe(d1.id);
  });

  it("clear removes all definitions", () => {
    registry.register(makeDef());
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveWorkerDefinition
// ---------------------------------------------------------------------------

describe("resolveWorkerDefinition", () => {
  it("resolves a known definition", () => {
    const registry = new WorkerRegistry();
    const def = makeDef();
    registry.register(def);
    const result = resolveWorkerDefinition(def.id, registry);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition).toBe(def);
    }
  });

  it("fails for unknown definition", () => {
    const registry = new WorkerRegistry();
    const result = resolveWorkerDefinition(
      asWorkerDefinitionId("unknown"),
      registry,
    );
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WorkerManager
// ---------------------------------------------------------------------------

describe("WorkerManager", () => {
  let registry: WorkerRegistry;
  let manager: WorkerManager;

  beforeEach(() => {
    _resetWorkerCounter();
    registry = new WorkerRegistry();
    registry.register(makeDef());
    registry.register(
      makeDef({
        id: asWorkerDefinitionId("def-miner-1"),
        displayName: "Miner",
        profession: "miner",
      }),
    );
    manager = new WorkerManager(registry);
  });

  it("creates a worker from a known definition", () => {
    const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.worker.profession).toBe("woodcutter");
      expect(result.worker.mastery).toBe(0);
      expect(result.worker.state).toBe("idle");
      expect(result.worker.displayName).toBe("Woodcutter");
    }
  });

  it("creates a worker with a custom display name", () => {
    const result = manager.createWorker(
      asWorkerDefinitionId("def-woodcutter-1"),
      "Bob the Woodcutter",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.worker.displayName).toBe("Bob the Woodcutter");
    }
  });

  it("fails to create with unknown definition", () => {
    const result = manager.createWorker(asWorkerDefinitionId("unknown"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("unknown_worker_definition");
    }
  });

  it("getWorker retrieves by id", () => {
    const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(manager.getWorker(result.worker.id)).toBe(result.worker);
    }
  });

  it("getAllWorkers returns all created workers", () => {
    manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
    manager.createWorker(asWorkerDefinitionId("def-miner-1"));
    expect(manager.getAllWorkers()).toHaveLength(2);
  });

  it("removeWorker deletes a worker", () => {
    const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(manager.removeWorker(result.worker.id)).toBe(true);
      expect(manager.getWorker(result.worker.id)).toBeUndefined();
    }
  });

  it("removeWorker returns false for unknown id", () => {
    expect(manager.removeWorker(asWorkerId("nope"))).toBe(false);
  });

  // State transitions
  describe("state transitions", () => {
    it("idle → assigned → working → idle", () => {
      const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const { id } = result.worker;

      expect(manager.updateState(id, "assigned")).toBe(true);
      expect(manager.getWorker(id)!.state).toBe("assigned");

      expect(manager.updateState(id, "working")).toBe(true);
      expect(manager.getWorker(id)!.state).toBe("working");

      expect(manager.updateState(id, "idle")).toBe(true);
      expect(manager.getWorker(id)!.state).toBe("idle");
    });

    it("updateState returns false for unknown worker", () => {
      expect(manager.updateState(asWorkerId("nope"), "idle")).toBe(false);
    });
  });

  // Mastery
  describe("mastery", () => {
    it("addMastery increases mastery", () => {
      const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      manager.addMastery(result.worker.id, 5);
      expect(manager.getWorker(result.worker.id)!.mastery).toBe(5);

      manager.addMastery(result.worker.id, 3);
      expect(manager.getWorker(result.worker.id)!.mastery).toBe(8);
    });

    it("addMastery returns false for unknown worker", () => {
      expect(manager.addMastery(asWorkerId("nope"), 1)).toBe(false);
    });
  });

  // Profession filtering
  it("getWorkersByProfession filters correctly", () => {
    manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
    manager.createWorker(asWorkerDefinitionId("def-miner-1"));
    expect(manager.getWorkersByProfession("woodcutter")).toHaveLength(1);
    expect(manager.getWorkersByProfession("miner")).toHaveLength(1);
    expect(manager.getWorkersByProfession("skinner")).toHaveLength(0);
  });

  // Events
  describe("events", () => {
    it("publishes worker:created on createWorker", () => {
      const events: unknown[] = [];
      manager.events.subscribe("worker:created", (e) => events.push(e));
      manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
      expect(events).toHaveLength(1);
    });

    it("publishes worker:removed on removeWorker", () => {
      const events: unknown[] = [];
      manager.events.subscribe("worker:removed", (e) => events.push(e));
      const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
      if (result.ok) {
        manager.removeWorker(result.worker.id);
      }
      expect(events).toHaveLength(1);
    });

    it("publishes worker:stateChanged on updateState", () => {
      const events: unknown[] = [];
      manager.events.subscribe("worker:stateChanged", (e) => events.push(e));
      const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
      if (result.ok) {
        manager.updateState(result.worker.id, "assigned");
      }
      expect(events).toHaveLength(1);
    });

    it("publishes worker:masteryGained on addMastery", () => {
      const events: unknown[] = [];
      manager.events.subscribe("worker:masteryGained", (e) => events.push(e));
      const result = manager.createWorker(asWorkerDefinitionId("def-woodcutter-1"));
      if (result.ok) {
        manager.addMastery(result.worker.id, 10);
      }
      expect(events).toHaveLength(1);
    });
  });
});
