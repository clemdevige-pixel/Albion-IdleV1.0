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
  { sourceLevel: 1, sourceTier: 3, targetTier: 4, monoCost: 15, workshopFamilyCost: 4, workshopTotalCost: 16, islandSilver: 1000, monoSilver: 300, workshopSilver: 500, totalSilver: 3900 },
  { sourceLevel: 2, sourceTier: 4, targetTier: 5, monoCost: 40, workshopFamilyCost: 10, workshopTotalCost: 40, islandSilver: 18000, monoSilver: 4500, workshopSilver: 6000, totalSilver: 60000 },
  { sourceLevel: 3, sourceTier: 5, targetTier: 6, monoCost: 70, workshopFamilyCost: 18, workshopTotalCost: 72, islandSilver: 60000, monoSilver: 14500, workshopSilver: 24000, totalSilver: 200000 },
  { sourceLevel: 4, sourceTier: 6, targetTier: 7, monoCost: 110, workshopFamilyCost: 28, workshopTotalCost: 112, islandSilver: 155000, monoSilver: 38000, workshopSilver: 66000, totalSilver: 525000 },
  { sourceLevel: 5, sourceTier: 7, targetTier: 8, monoCost: 160, workshopFamilyCost: 40, workshopTotalCost: 160, islandSilver: 270000, monoSilver: 65000, workshopSilver: 110000, totalSilver: 900000 },
] as const;

describe("island production progression balance contract", () => {
  it("uses the validated gathering mastery gates", () => {
    expect(GATHERING_MASTERY_UNLOCK_BY_TIER).toEqual({ 3: 0, 4: 3, 5: 7, 6: 11, 7: 18, 8: 25 });
    expect(UPGRADE_CASES.map(({ targetTier }) => getRequiredGatheringMasteryForTier(targetTier))).toEqual([3, 7, 11, 18, 25]);
  });

  it("uses the validated mono-family building costs through T8", () => {
    for (const { sourceLevel, sourceTier, monoCost } of UPGRADE_CASES) {
      const definition = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel);
      expect(definition?.maxProductionTier).toBe(sourceTier);
      expect(definition?.upgradeToNext?.requirements).toEqual([
        expect.objectContaining({ quantity: monoCost }),
      ]);
    }
    expect(getIslandOperationalLevelDefinition("lumber_camp", 6)?.maxProductionTier).toBe(8);
  });

  it("requires all four refined families for every workshop upgrade", () => {
    for (const { sourceLevel, sourceTier, workshopFamilyCost, workshopTotalCost } of UPGRADE_CASES) {
      const definition = getIslandOperationalLevelDefinition("workshop", sourceLevel);
      const requirements = definition?.upgradeToNext?.requirements ?? [];
      expect(definition?.maxProductionTier).toBe(sourceTier);
      expect(definition?.upgradeToNext?.flexibleRequirement).toBeUndefined();
      expect(requirements).toHaveLength(4);
      expect(requirements.every((requirement) => requirement.quantity === workshopFamilyCost)).toBe(true);
      expect(requirements.reduce((sum, requirement) => sum + requirement.quantity, 0)).toBe(workshopTotalCost);
    }
    expect(getIslandOperationalLevelDefinition("workshop", 6)?.maxProductionTier).toBe(8);
  });

  it("uses the validated Silver sink curve", () => {
    for (const { sourceLevel, islandSilver, monoSilver, workshopSilver, totalSilver } of UPGRADE_CASES) {
      const islandTargetLevel = sourceLevel + 1;
      const island = getIslandLevelDefinition(islandTargetLevel);
      const mono = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel);
      const workshop = getIslandOperationalLevelDefinition("workshop", sourceLevel);

      expect(island?.upgradeCost?.silver).toBe(islandSilver);
      expect(mono?.upgradeToNext?.silver).toBe(monoSilver);
      expect(workshop?.upgradeToNext?.silver).toBe(workshopSilver);
      expect(islandSilver + monoSilver * 8 + workshopSilver).toBe(totalSilver);
    }
  });

  it("allows building level 6 after the T7 final world gate", () => {
    const level6 = getIslandLevelDefinition(6);
    expect(level6?.maxBuildingLevel).toBe(6);
    expect(level6?.worldRequirementToReach?.zoneDefId).toBe("zone_doompeak_t7");
  });
});
