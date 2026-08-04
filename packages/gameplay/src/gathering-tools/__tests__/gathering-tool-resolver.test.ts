import { describe, it, expect } from "vitest";
import { getRequiredToolType, findMatchingTool } from "../gathering-tool-resolver.js";
import { asGatheringToolId } from "../gathering-tool-types.js";
import type { GatheringToolDefinition } from "../gathering-tool-types.js";
import type { ResourceFamily } from "../../resources/resource-types.js";

function makeTool(overrides: Partial<GatheringToolDefinition> = {}): GatheringToolDefinition {
  return {
    id: asGatheringToolId("tool-1"),
    name: "Tool",
    toolType: "axe",
    tier: 1,
    speedModifier: 1,
    yieldModifier: 1,
    tags: [],
    ...overrides,
  };
}

describe("getRequiredToolType", () => {
  const cases: Array<[ResourceFamily, string]> = [
    ["Wood", "axe"],
    ["Stone", "hammer"],
    ["Ore", "pickaxe"],
    ["Fiber", "sickle"],
    ["Hide", "skinning_knife"],
  ];

  it.each(cases)("%s requires %s", (family, expected) => {
    expect(getRequiredToolType(family)).toBe(expected);
  });
});

describe("findMatchingTool", () => {
  it("returns the highest-tier tool of the correct type", () => {
    const low = makeTool({ id: asGatheringToolId("low"), tier: 2 });
    const high = makeTool({ id: asGatheringToolId("high"), tier: 5 });
    const wrong = makeTool({ id: asGatheringToolId("wrong"), toolType: "hammer", tier: 8 });
    expect(findMatchingTool("axe", [low, wrong, high])).toBe(high);
  });

  it("returns undefined when no tool matches", () => {
    const hammer = makeTool({ toolType: "hammer" });
    expect(findMatchingTool("pickaxe", [hammer])).toBeUndefined();
  });

  it("returns undefined for empty array", () => {
    expect(findMatchingTool("axe", [])).toBeUndefined();
  });
});
