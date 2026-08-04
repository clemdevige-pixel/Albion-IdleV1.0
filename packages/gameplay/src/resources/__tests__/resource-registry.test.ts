import { describe, it, expect, beforeEach } from "vitest";
import { ResourceRegistry } from "../resource-registry.js";
import type { ResourceDefinition } from "../resource-types.js";
import { asResourceDefinitionId } from "../resource-types.js";

function makeDef(id: string, family: "Wood" | "Stone" | "Ore" | "Fiber" | "Hide" = "Wood"): ResourceDefinition {
  return {
    id: asResourceDefinitionId(id),
    name: `Resource ${id}`,
    family,
    tier: 3,
    maxCharges: 5,
    respawnDurationTicks: 120,
    baseYield: 1,
    tags: ["forest"],
  };
}

describe("ResourceRegistry", () => {
  let registry: ResourceRegistry;

  beforeEach(() => {
    registry = new ResourceRegistry();
  });

  it("registers and retrieves a definition", () => {
    const def = makeDef("oak_log");
    registry.register(def);
    expect(registry.get(def.id)).toBe(def);
    expect(registry.has(def.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    const def = makeDef("oak_log");
    registry.register(def);
    expect(() => registry.register(def)).toThrow(/already registered/);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asResourceDefinitionId("nope"))).toBeUndefined();
    expect(registry.has(asResourceDefinitionId("nope"))).toBe(false);
  });

  it("getAll returns all definitions", () => {
    registry.register(makeDef("a"));
    registry.register(makeDef("b"));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("getByFamily filters correctly", () => {
    registry.register(makeDef("oak", "Wood"));
    registry.register(makeDef("granite", "Stone"));
    registry.register(makeDef("birch", "Wood"));
    expect(registry.getByFamily("Wood")).toHaveLength(2);
    expect(registry.getByFamily("Stone")).toHaveLength(1);
    expect(registry.getByFamily("Ore")).toHaveLength(0);
  });

  it("clear removes all definitions", () => {
    registry.register(makeDef("a"));
    registry.register(makeDef("b"));
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });
});
