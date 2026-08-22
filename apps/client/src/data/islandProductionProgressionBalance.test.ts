import { describe, expect, it } from "vitest";
import {
  getIslandLevelDefinition,
  getIslandMaxProductionTier,
  getIslandUpgradeableLevelDefinition,
} from "@game/data";
import {
  GATHERING_MASTERY_UNLOCK_BY_TIER,
  getRequiredGatheringMasteryForTier,
} from "./progressionContentCatalog.js";

const ISLAND_TIER_CASES = [
  { islandLevel: 1, productionTier: 3 },
  { islandLevel: 2, productionTier: 4 },
  { islandLevel: 3, productionTier: 5 },
  { islandLevel: 4, productionTier: 6 },
  { islandLevel: 5, productionTier: 7 },
  { islandLevel: 6, productionTier: 8 },
] as const;

const CURRENT_ISLAND_SILVER_COSTS = [
  { targetLevel: 2, silver: 1_000 },
  { targetLevel: 3, silver: 18_000 },
  { targetLevel: 4, silver: 60_000 },
  { targetLevel: 5, silver: 155_000 },
  { targetLevel: 6, silver: 270_000 },
] as const;

describe("island production progression balance contract", () => {
  it("uses the validated gathering mastery gates", () => {
    expect(GATHERING_MASTERY_UNLOCK_BY_TIER).toEqual({ 3: 0, 4: 3, 5: 7, 6: 11, 7: 18, 8: 25 });
    expect(ISLAND_TIER_CASES.map(({ productionTier }) => getRequiredGatheringMasteryForTier(productionTier)))
      .toEqual([0, 3, 7, 11, 18, 25]);
  });

  it("makes island level the single production-tier authority", () => {
    for (const { islandLevel, productionTier } of ISLAND_TIER_CASES) {
      expect(getIslandLevelDefinition(islandLevel)?.maxProductionTier).toBe(productionTier);
      expect(getIslandMaxProductionTier(islandLevel)).toBe(productionTier);
    }
  });

  it("keeps gathering refining and workshop buildings construction-only", () => {
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
    }
  });

  it("keeps current island Silver costs until the dedicated economy retuning pass", () => {
    for (const { targetLevel, silver } of CURRENT_ISLAND_SILVER_COSTS) {
      expect(getIslandLevelDefinition(targetLevel)?.upgradeCost?.silver).toBe(silver);
    }
  });

  it("opens T8 production after the T7 final world gate", () => {
    const level6 = getIslandLevelDefinition(6);
    expect(level6?.maxProductionTier).toBe(8);
    expect(level6?.worldRequirementToReach?.zoneDefId).toBe("zone_doompeak_t7");
  });
});
