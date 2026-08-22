import { describe, expect, it } from "vitest";
import { WorkerManager, _resetWorkerCounter } from "../workers/worker-manager.js";
import { WorkerRegistry } from "../workers/worker-registry.js";
import { asWorkerDefinitionId, type WorkerDefinition } from "../workers/worker-types.js";

describe("worker authored display names", () => {
  it("uses a distinct authored name for each instance of the same worker definition", () => {
    _resetWorkerCounter();
    const registry = new WorkerRegistry();
    const definition: WorkerDefinition = {
      id: asWorkerDefinitionId("worker_test_woodcutter"),
      displayName: "Edda",
      displayNames: ["Edda", "Toren"],
      profession: "woodcutter",
      baseMasteryGainRate: 1,
      tags: ["gathering", "wood"],
    };
    registry.register(definition);
    const manager = new WorkerManager(registry);

    const first = manager.createWorker(definition.id);
    const second = manager.createWorker(definition.id);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.worker.displayName).toBe("Edda");
    expect(second.worker.displayName).toBe("Toren");
    expect(first.worker.displayName).not.toBe(second.worker.displayName);
  });

  it("preserves an explicit saved display name on restore-style creation", () => {
    _resetWorkerCounter();
    const registry = new WorkerRegistry();
    const definition: WorkerDefinition = {
      id: asWorkerDefinitionId("worker_test_miner"),
      displayName: "Borin",
      displayNames: ["Borin", "Dagr"],
      profession: "miner",
      baseMasteryGainRate: 1,
      tags: ["gathering", "ore"],
    };
    registry.register(definition);
    const manager = new WorkerManager(registry);

    const restored = manager.createWorker(definition.id, "Ancien nom sauvegardé");

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.worker.displayName).toBe("Ancien nom sauvegardé");
  });
});
