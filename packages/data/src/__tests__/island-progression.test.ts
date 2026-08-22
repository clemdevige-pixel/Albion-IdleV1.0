import { describe, expect, it } from "vitest";
import {
  ISLAND_LEVELS,
  getIslandMaxProductionTier,
} from "../config/island-levels.js";
import { getIslandUpgradeableLevelDefinition } from "../config/island-building-progression.js";

describe("island production progression", () => {
  it("maps island levels 1-6 to production tiers T3-T8", () => {
    expect(ISLAND_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ISLAND_LEVELS.map((level) => level.maxProductionTier)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(getIslandMaxProductionTier(1)).toBe(3);
    expect(getIslandMaxProductionTier(2)).toBe(4);
    expect(getIslandMaxProductionTier(3)).toBe(5);
    expect(getIslandMaxProductionTier(4)).toBe(6);
    expect(getIslandMaxProductionTier(5)).toBe(7);
    expect(getIslandMaxProductionTier(6)).toBe(8);
  });

  it("keeps standard production buildings construction-only", () => {
    for (const buildingId of [
      "lumber_camp",
      "mine",
      "hunting_camp",
      "fiber_camp",
      "sawmill",
      "smelter",
      "tannery",
      "weaver",
      "workshop",
    ] as const) {
      expect(getIslandUpgradeableLevelDefinition(buildingId, 1)).toBeUndefined();
      expect(getIslandUpgradeableLevelDefinition(buildingId, 2)).toBeUndefined();
    }
  });

  it("keeps Academy as an independently upgradeable special building", () => {
    expect(getIslandUpgradeableLevelDefinition("academy", 1)?.displayTier).toBe(4);
    expect(getIslandUpgradeableLevelDefinition("academy", 1)?.upgradeToNext).toBeDefined();
    expect(getIslandUpgradeableLevelDefinition("academy", 5)?.displayTier).toBe(8);
    expect(getIslandUpgradeableLevelDefinition("academy", 5)?.upgradeToNext).toBeUndefined();
  });
});
