import { describe, it, expect, beforeEach } from "vitest";
import { ResourceRegistry } from "../resource-registry.js";
import { createResource, _resetResourceCounter } from "../resource-factory.js";
import type { ResourceDefinition } from "../resource-types.js";
import { asResourceDefinitionId } from "../resource-types.js";

function makeDef(id: string): ResourceDefinition {
  return {
    id: asResourceDefinitionId(id),
    name: `Resource ${id}`,
    family: "Ore",
    tier: 4,
    maxCharges: 3,
    respawnDurationTicks: 60,
    baseYield: 2,
    tags: [],
  };
}

describe("createResource", () => {
  let registry: ResourceRegistry;

  beforeEach(() => {
    registry = new ResourceRegistry();
    _resetResourceCounter();
  });

  it("creates an instance with correct defaults", () => {
    const def = makeDef("iron_ore");
    registry.register(def);
    const instance = createResource(registry, def.id);

    expect(instance.definitionId).toBe(def.id);
    expect(instance.state).toBe("available");
    expect(instance.currentCharges).toBe(3);
    expect(instance.maxCharges).toBe(3);
    expect(instance.tier).toBe(4);
    expect(instance.family).toBe("Ore");
  });

  it("generates unique ids", () => {
    const def = makeDef("iron_ore");
    registry.register(def);
    const a = createResource(registry, def.id);
    const b = createResource(registry, def.id);
    expect(a.id).not.toBe(b.id);
  });

  it("throws for unknown definition", () => {
    expect(() => createResource(registry, asResourceDefinitionId("nope"))).toThrow(/not found/);
  });
});
