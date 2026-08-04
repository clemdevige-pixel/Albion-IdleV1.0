import { describe, it, expect } from "vitest";
import { resolveGatherResult } from "../gathering-resolver.js";
import { asResourceDefinitionId } from "../../resources/resource-types.js";
import type { ResourceDefinition } from "../../resources/resource-types.js";

function makeDef(overrides?: Partial<ResourceDefinition>): ResourceDefinition {
  return {
    id: asResourceDefinitionId("wood-t1"),
    name: "Rough Log",
    family: "Wood",
    tier: 1,
    maxCharges: 3,
    respawnDurationTicks: 10,
    baseYield: 5,
    tags: [],
    ...overrides,
  };
}

describe("resolveGatherResult", () => {
  it("calculates quantity from baseYield and modifiers", () => {
    const result = resolveGatherResult(makeDef({ baseYield: 10 }), 1, 1);
    expect(result.quantityGathered).toBe(10);
  });

  it("applies tool modifier", () => {
    const result = resolveGatherResult(makeDef({ baseYield: 10 }), 1.5, 1);
    // floor(10 * 1.5 * 1) = 15
    expect(result.quantityGathered).toBe(15);
  });

  it("applies mastery modifier", () => {
    const result = resolveGatherResult(makeDef({ baseYield: 10 }), 1, 2);
    expect(result.quantityGathered).toBe(20);
  });

  it("floors the result", () => {
    const result = resolveGatherResult(makeDef({ baseYield: 3 }), 1.1, 1);
    // floor(3 * 1.1) = floor(3.3) = 3
    expect(result.quantityGathered).toBe(3);
  });

  it("guarantees minimum of 1", () => {
    const result = resolveGatherResult(makeDef({ baseYield: 1 }), 0.1, 0.1);
    // floor(1 * 0.1 * 0.1) = floor(0.01) = 0 → max(1, 0) = 1
    expect(result.quantityGathered).toBe(1);
  });

  it("returns correct resourceFamily and tier", () => {
    const result = resolveGatherResult(
      makeDef({ family: "Ore", tier: 4 }),
      1,
      1,
    );
    expect(result.resourceFamily).toBe("Ore");
    expect(result.resourceTier).toBe(4);
  });

  it("returns nodeExhausted as false", () => {
    const result = resolveGatherResult(makeDef(), 1, 1);
    expect(result.nodeExhausted).toBe(false);
  });
});
