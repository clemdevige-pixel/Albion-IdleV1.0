import { describe, expect, it } from "vitest";
import {
  getIslandOperationalLevelDefinition,
  getIslandLevelDefinition,
} from "@game/data";
import {
  GATHERING_MASTERY_UNLOCK_BY_TIER,
  getRequiredGatheringMasteryForTier,
} from "./progressionContentCatalog.js";

const TARGET_TIERS = [4, 5, 6, 7, 8] as const;
const MONO_COSTS = [15, 40, 70, 110, 160] as const;

describe("island production progression balance contract", () => {
  it("uses the validated gathering mastery gates", () => {
    expect(GATHERING_MASTERY_UNLOCK_BY_TIER).toEqual({ 3: 0, 4: 3, 5: 7, 6: 11, 7: 18, 8: 25 });
    expect(TARGET_TIERS.map((tier) => getRequiredGatheringMasteryForTier(tier))).toEqual([3, 7, 11, 18, 25]);
  });

  it("uses the validated mono-family building costs through T8", () => {
    for (const [index, targetTier] of TARGET_TIERS.entries()) {
      const sourceLevel = index + 1;
      const definition = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel);
      expect(definition?.maxProductionTier).toBe(targetTier - 1);
      expect(definition?.upgradeToNext?.requirements).toEqual([
        expect.objectContaining({ quantity: MONO_COSTS[index] }),
      ]);
    }
    expect(getIslandOperationalLevelDefinition("lumber_camp", 6)?.maxProductionTier).toBe(8);
  });

  it("uses a flexible three-family workshop cost matching the mono cost", () => {
    for (const [index, targetTier] of TARGET_TIERS.entries()) {
      const sourceLevel = index + 1;
      const definition = getIslandOperationalLevelDefinition("workshop", sourceLevel);
      const flexible = definition?.upgradeToNext?.flexibleRequirement;
      expect(definition?.maxProductionTier).toBe(targetTier - 1);
      expect(definition?.upgradeToNext?.requirements).toEqual([]);
      expect(flexible?.totalQuantity).toBe(MONO_COSTS[index]);
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
