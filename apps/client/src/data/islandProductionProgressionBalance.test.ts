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

const ISLAND_UPGRADE_CASES = [
  { targetLevel: 2, sourceTier: 3, silver: 2_000, quantityPerFamily: 8 },
  { targetLevel: 3, sourceTier: 4, silver: 30_000, quantityPerFamily: 20 },
  { targetLevel: 4, sourceTier: 5, silver: 100_000, quantityPerFamily: 40 },
  { targetLevel: 5, sourceTier: 6, silver: 265_000, quantityPerFamily: 60 },
  { targetLevel: 6, sourceTier: 7, silver: 450_000, quantityPerFamily: 90 },
] as const;

const REFINED_FAMILY_TOKEN = ["planks", "bar", "leather", "cloth"] as const;

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

  it("uses the centralized island Silver curve", () => {
    for (const { targetLevel, silver } of ISLAND_UPGRADE_CASES) {
      expect(getIslandLevelDefinition(targetLevel)?.upgradeCost?.silver).toBe(silver);
    }
  });

  it("requires all four refined families equally at every island tier transition", () => {
    for (const { targetLevel, sourceTier, quantityPerFamily } of ISLAND_UPGRADE_CASES) {
      const requirements = getIslandLevelDefinition(targetLevel)?.upgradeCost?.requirements ?? [];
      expect(requirements).toHaveLength(4);
      expect(requirements.every((requirement) => requirement.quantity === quantityPerFamily)).toBe(true);
      expect(requirements.every((requirement) => requirement.itemId.endsWith(`_t${String(sourceTier)}`))).toBe(true);
      for (const token of REFINED_FAMILY_TOKEN) {
        expect(requirements.some((requirement) => requirement.itemId.includes(token))).toBe(true);
      }
    }
  });

  it("opens T8 production after the T7 final world gate", () => {
    const level6 = getIslandLevelDefinition(6);
    expect(level6?.maxProductionTier).toBe(8);
    expect(level6?.worldRequirementToReach?.zoneDefId).toBe("zone_doompeak_t7");
  });
});
