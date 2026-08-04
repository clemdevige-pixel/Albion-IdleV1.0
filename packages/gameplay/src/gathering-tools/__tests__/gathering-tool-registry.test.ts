import { describe, it, expect, beforeEach } from "vitest";
import { GatheringToolRegistry } from "../gathering-tool-registry.js";
import { asGatheringToolId } from "../gathering-tool-types.js";
import type { GatheringToolDefinition } from "../gathering-tool-types.js";

function makeTool(overrides: Partial<GatheringToolDefinition> = {}): GatheringToolDefinition {
  return {
    id: asGatheringToolId("tool-1"),
    name: "Beginner Axe",
    toolType: "axe",
    tier: 1,
    speedModifier: 1,
    yieldModifier: 1,
    tags: [],
    ...overrides,
  };
}

describe("GatheringToolRegistry", () => {
  let registry: GatheringToolRegistry;

  beforeEach(() => {
    registry = new GatheringToolRegistry();
  });

  it("registers and retrieves a tool definition", () => {
    const tool = makeTool();
    registry.register(tool);
    expect(registry.get(tool.id)).toBe(tool);
    expect(registry.has(tool.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    registry.register(makeTool());
    expect(() => registry.register(makeTool())).toThrow("already registered");
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asGatheringToolId("nope"))).toBeUndefined();
    expect(registry.has(asGatheringToolId("nope"))).toBe(false);
  });

  it("getAll returns all registered definitions", () => {
    const a = makeTool({ id: asGatheringToolId("a") });
    const b = makeTool({ id: asGatheringToolId("b"), toolType: "hammer" });
    registry.register(a);
    registry.register(b);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("getByType filters by tool type", () => {
    const axe = makeTool({ id: asGatheringToolId("a"), toolType: "axe" });
    const hammer = makeTool({ id: asGatheringToolId("b"), toolType: "hammer" });
    registry.register(axe);
    registry.register(hammer);
    expect(registry.getByType("axe")).toEqual([axe]);
    expect(registry.getByType("hammer")).toEqual([hammer]);
    expect(registry.getByType("sickle")).toEqual([]);
  });

  it("clear removes all definitions", () => {
    registry.register(makeTool());
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toEqual([]);
  });
});
