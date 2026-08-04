import { describe, it, expect } from "vitest";
import { validateTool } from "../gathering-tool-validator.js";
import { asGatheringToolId } from "../gathering-tool-types.js";
import type { GatheringToolDefinition } from "../gathering-tool-types.js";

function makeTool(overrides: Partial<GatheringToolDefinition> = {}): GatheringToolDefinition {
  return {
    id: asGatheringToolId("tool-1"),
    name: "Tool",
    toolType: "axe",
    tier: 3,
    speedModifier: 1,
    yieldModifier: 1,
    tags: [],
    ...overrides,
  };
}

describe("validateTool", () => {
  it("returns valid for correct type and sufficient tier", () => {
    const result = validateTool(makeTool({ toolType: "axe", tier: 3 }), "Wood", 3);
    expect(result).toEqual({ valid: true });
  });

  it("returns valid when tool tier exceeds required", () => {
    const result = validateTool(makeTool({ toolType: "hammer", tier: 5 }), "Stone", 2);
    expect(result).toEqual({ valid: true });
  });

  it("fails when tool is undefined", () => {
    const result = validateTool(undefined, "Wood", 1);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("No tool");
    }
  });

  it("fails when tool type does not match family", () => {
    const result = validateTool(makeTool({ toolType: "sickle" }), "Wood", 1);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Wrong tool type");
    }
  });

  it("fails when tool tier is below required", () => {
    const result = validateTool(makeTool({ toolType: "axe", tier: 2 }), "Wood", 4);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("below required tier");
    }
  });
});
