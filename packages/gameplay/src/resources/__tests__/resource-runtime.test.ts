import { describe, it, expect, beforeEach } from "vitest";
import { ResourceRuntime } from "../resource-runtime.js";
import { ResourceRegistry } from "../resource-registry.js";
import { createResource, _resetResourceCounter } from "../resource-factory.js";
import type { ResourceDefinition, ResourceInstance } from "../resource-types.js";
import { asResourceDefinitionId, asResourceId } from "../resource-types.js";
import type {
  ResourceCreatedEvent,
  ResourceHarvestedEvent,
  ResourceDepletedEvent,
  ResourceRestoredEvent,
  ResourceDestroyedEvent,
  ResourceStateChangedEvent,
} from "../resource-events.js";

function makeDef(id: string, charges = 3): ResourceDefinition {
  return {
    id: asResourceDefinitionId(id),
    name: `Resource ${id}`,
    family: "Wood",
    tier: 2,
    maxCharges: charges,
    respawnDurationTicks: 60,
    baseYield: 1,
    tags: [],
  };
}

describe("ResourceRuntime", () => {
  let runtime: ResourceRuntime;
  let registry: ResourceRegistry;

  beforeEach(() => {
    runtime = new ResourceRuntime();
    registry = new ResourceRegistry();
    _resetResourceCounter();
  });

  function spawnInstance(defId = "oak", charges = 3): ResourceInstance {
    const def = makeDef(defId, charges);
    if (!registry.has(def.id)) {
      registry.register(def);
    }
    const instance = createResource(registry, def.id);
    runtime.add(instance);
    return instance;
  }

  it("add and get", () => {
    const instance = spawnInstance();
    expect(runtime.get(instance.id)).toEqual(instance);
    expect(runtime.size).toBe(1);
  });

  it("add emits resourceCreated", () => {
    const events: ResourceCreatedEvent[] = [];
    runtime.events.subscribe("resourceCreated", (e) => events.push(e));
    const instance = spawnInstance();
    expect(events).toHaveLength(1);
    expect(events[0]!.resourceId).toBe(instance.id);
  });

  it("harvest reduces charges", () => {
    const instance = spawnInstance("oak", 3);
    expect(runtime.harvest(instance.id)).toBe(true);
    const updated = runtime.get(instance.id)!;
    expect(updated.currentCharges).toBe(2);
    expect(updated.state).toBe("available");
  });

  it("harvest emits resourceHarvested", () => {
    const instance = spawnInstance("oak", 2);
    const events: ResourceHarvestedEvent[] = [];
    runtime.events.subscribe("resourceHarvested", (e) => events.push(e));
    runtime.harvest(instance.id);
    expect(events).toHaveLength(1);
    expect(events[0]!.currentCharges).toBe(1);
  });

  it("harvest to depletion", () => {
    const instance = spawnInstance("oak", 1);
    const depleted: ResourceDepletedEvent[] = [];
    const stateChanged: ResourceStateChangedEvent[] = [];
    runtime.events.subscribe("resourceDepleted", (e) => depleted.push(e));
    runtime.events.subscribe("resourceStateChanged", (e) => stateChanged.push(e));

    expect(runtime.harvest(instance.id)).toBe(true);

    const updated = runtime.get(instance.id)!;
    expect(updated.currentCharges).toBe(0);
    expect(updated.state).toBe("depleted");
    expect(depleted).toHaveLength(1);
    expect(stateChanged).toHaveLength(1);
    expect(stateChanged[0]!.previousState).toBe("available");
    expect(stateChanged[0]!.newState).toBe("depleted");
  });

  it("harvest fails on depleted resource", () => {
    const instance = spawnInstance("oak", 1);
    runtime.harvest(instance.id);
    expect(runtime.harvest(instance.id)).toBe(false);
  });

  it("harvest fails on unknown id", () => {
    expect(runtime.harvest(asResourceId("unknown"))).toBe(false);
  });

  it("restore resets charges and state", () => {
    const instance = spawnInstance("oak", 1);
    runtime.harvest(instance.id);
    // Move to respawning first (depleted -> respawning is valid)
    const dep = runtime.get(instance.id)!;
    // Manually set to respawning by replacing
    runtime.clear();
    const respawning: ResourceInstance = { ...dep, state: "respawning" };
    runtime.add(respawning);

    const restored: ResourceRestoredEvent[] = [];
    runtime.events.subscribe("resourceRestored", (e) => restored.push(e));

    expect(runtime.restore(respawning.id)).toBe(true);
    const updated = runtime.get(respawning.id)!;
    expect(updated.state).toBe("available");
    expect(updated.currentCharges).toBe(1);
    expect(restored).toHaveLength(1);
  });

  it("restore fails from available state", () => {
    const instance = spawnInstance("oak", 3);
    expect(runtime.restore(instance.id)).toBe(false);
  });

  it("destroy removes instance and emits events", () => {
    const instance = spawnInstance("oak", 3);
    const destroyed: ResourceDestroyedEvent[] = [];
    const stateChanged: ResourceStateChangedEvent[] = [];
    runtime.events.subscribe("resourceDestroyed", (e) => destroyed.push(e));
    runtime.events.subscribe("resourceStateChanged", (e) => stateChanged.push(e));

    expect(runtime.destroy(instance.id)).toBe(true);
    expect(runtime.get(instance.id)).toBeUndefined();
    expect(runtime.size).toBe(0);
    expect(destroyed).toHaveLength(1);
    expect(stateChanged).toHaveLength(1);
    expect(stateChanged[0]!.newState).toBe("destroyed");
  });

  it("destroy fails on unknown id", () => {
    expect(runtime.destroy(asResourceId("unknown"))).toBe(false);
  });

  it("getByState filters correctly", () => {
    spawnInstance("oak", 3);
    const b = spawnInstance("birch", 1);
    runtime.harvest(b.id); // deplete birch
    expect(runtime.getByState("available")).toHaveLength(1);
    expect(runtime.getByState("depleted")).toHaveLength(1);
  });

  it("clear removes all instances", () => {
    spawnInstance("a");
    spawnInstance("b");
    runtime.clear();
    expect(runtime.size).toBe(0);
  });
});
