import { describe, expect, it } from "vitest";
import {
  getIslandOperationalLevelDefinition,
  getIslandLevelDefinition,
} from "@game/data";
import {
  GATHERING_MASTERY_UNLOCK_BY_TIER,
  getRequiredGatheringMasteryForTier,
} from "./progressionContentCatalog.js";

const UPGRADE_CASES = [
  { sourceLevel: 1, sourceTier: 3, targetTier: 4, cost: 15 },
  { sourceLevel: 2, sourceTier: 4, targetTier: 5, cost: 40 },
  { sourceLevel: 3, sourceTier: 5, targetTier: 6, cost: 70 },
  { sourceLevel: 4, sourceTier: 6, targetTier: 7, cost: 110 },
  { sourceLevel: 5, sourceTier: 7, targetTier: 8, cost: 160 },
] as const;

describe("island production progression balance contract", () => {
  it("uses the validated gathering mastery gates", () => {
    expect(GATHERING_MASTERY_UNLOCK_BY_TIER).toEqual({ 3: 0, 4: 3, 5: 7, 6: 11, 7: 18, 8: 25 });
    expect(UPGRADE_CASES.map(({ targetTier }) => getRequiredGatheringMasteryForTier(targetTier))).toEqual([3, 7, 11, 18, 25]);
  });

  it("uses the validated mono-family building costs through T8", () => {
    for (const { sourceLevel, sourceTier, cost } of UPGRADE_CASES) {
      const definition = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel);
      expect(definition?.maxProductionTier).toBe(sourceTier);
      expect(definition?.upgradeToNext?.requirements).toEqual([
        expect.objectContaining({ quantity: cost }),
      ]);
    }
    expect(getIslandOperationalLevelDefinition("lumber_camp", 6)?.maxProductionTier).toBe(8);
  });

  it("uses a flexible three-family workshop cost matching the mono cost", () => {
    for (const { sourceLevel, sourceTier, cost } of UPGRADE_CASES) {
      const definition = getIslandOperationalLevelDefinition("workshop", sourceLevel);
      const flexible = definition?.upgradeToNext?.flexibleRequirement;
      expect(definition?.maxProductionTier).toBe(sourceTier);
      expect(definition?.upgradeToNext?.requirements).toEqual([]);
      expect(flexible?.totalQuantity).toBe(cost);
      expect(flexible?.minimumDistinctItemIds).toBe(3);
      expect(flexible?.itemIds).toHaveLength(4);
    }
    expect(getIslandOperationalLevelDefinition("workshop", 6)?.maxProductionTier).toBe(8);
  });

  it("allows building level 6 after the T7 final world gate", () => {
    const level6 = getIslandLevelDefinition(6);
    expect(level6?.maxBuildingLevel).toBe(6);
    expect(level6?.worldRequirementToReach?.zoneDefId).toBe("zone_doompeak_t7");
  });
});
