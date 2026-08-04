import { describe, it, expect, beforeEach } from "vitest";
import { ResourceNodeRegistry } from "../resource-node-registry.js";
import { asResourceNodeDefinitionId } from "../resource-node-types.js";
import { asResourceDefinitionId } from "../../resources/resource-types.js";
import type { ResourceNodeDefinition } from "../resource-node-types.js";

function makeDef(id: string): ResourceNodeDefinition {
  return {
    id: asResourceNodeDefinitionId(id),
    name: `Node ${id}`,
    resourceDefinitionId: asResourceDefinitionId("res-1"),
    requiredToolTier: 1,
    tags: [],
  };
}

describe("ResourceNodeRegistry", () => {
  let registry: ResourceNodeRegistry;

  beforeEach(() => {
    registry = new ResourceNodeRegistry();
  });

  it("registers and retrieves a definition", () => {
    const def = makeDef("a");
    registry.register(def);
    expect(registry.get(def.id)).toBe(def);
    expect(registry.has(def.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    const def = makeDef("a");
    registry.register(def);
    expect(() => registry.register(def)).toThrow(/already registered/);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asResourceNodeDefinitionId("nope"))).toBeUndefined();
    expect(registry.has(asResourceNodeDefinitionId("nope"))).toBe(false);
  });

  it("getAll returns all definitions", () => {
    registry.register(makeDef("a"));
    registry.register(makeDef("b"));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("clear removes all definitions", () => {
    registry.register(makeDef("a"));
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });
});
