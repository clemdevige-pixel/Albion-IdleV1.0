import { describe, expect, it } from "vitest";
import {
  ISLAND_LEVELS,
  getIslandLevelDefinition,
  getIslandMaxProductionTier,
} from "../config/island-levels.js";
import {
  getIslandSynchronizedBuildingLevel,
  getIslandUpgradeableLevelDefinition,
} from "../config/island-building-progression.js";

const UPGRADE_CASES = [
  { targetLevel: 2, sourceTier: 3, silver: 2_000, quantityPerFamily: 8 },
  { targetLevel: 3, sourceTier: 4, silver: 35_000, quantityPerFamily: 25 },
  { targetLevel: 4, sourceTier: 5, silver: 120_000, quantityPerFamily: 50 },
  { targetLevel: 5, sourceTier: 6, silver: 315_000, quantityPerFamily: 75 },
  { targetLevel: 6, sourceTier: 7, silver: 535_000, quantityPerFamily: 110 },
] as const;

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

  it("centralizes tier transition and Academy costs on island levels", () => {
    for (const { targetLevel, sourceTier, silver, quantityPerFamily } of UPGRADE_CASES) {
      const upgrade = getIslandLevelDefinition(targetLevel)?.upgradeCost;
      expect(upgrade?.silver).toBe(silver);
      expect(upgrade?.requirements).toHaveLength(4);
      expect(upgrade?.requirements.every((entry) => entry.quantity === quantityPerFamily)).toBe(true);
      expect(upgrade?.requirements.every((entry) => entry.itemId.endsWith(`_t${String(sourceTier)}`))).toBe(true);
    }
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

  it("synchronizes Academy tiers to the global Island Level", () => {
    expect(getIslandUpgradeableLevelDefinition("academy", 1)?.displayTier).toBe(4);
    expect(getIslandUpgradeableLevelDefinition("academy", 1)?.upgradeToNext).toBeUndefined();
    expect(getIslandUpgradeableLevelDefinition("academy", 5)?.displayTier).toBe(8);
    expect([1, 2, 3, 4, 5, 6].map((level) => getIslandSynchronizedBuildingLevel("academy", level)))
      .toEqual([undefined, 1, 2, 3, 4, 5]);
  });
});
