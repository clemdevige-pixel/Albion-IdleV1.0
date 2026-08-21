import { describe, expect, it } from "vitest";
import {
  ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS,
  getIslandBuildingMaxProductionTier,
} from "../config/island-progression.js";

describe("island operational progression", () => {
  it("maps building levels 1-6 to production tiers T3-T8", () => {
    for (const progression of ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS) {
      expect(progression.levels.map((level) => level.level)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(progression.levels.map((level) => level.maxProductionTier)).toEqual([3, 4, 5, 6, 7, 8]);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 1)).toBe(3);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 2)).toBe(4);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 3)).toBe(5);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 4)).toBe(6);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 5)).toBe(7);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 6)).toBe(8);
    }
  });

  it("charges each upgrade with the refined tier immediately below its unlock", () => {
    for (const progression of ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS) {
      const level1Cost = progression.levels[0]?.upgradeToNext;
      const level2Cost = progression.levels[1]?.upgradeToNext;
      const level3Cost = progression.levels[2]?.upgradeToNext;
      const level4Cost = progression.levels[3]?.upgradeToNext;
      const level5Cost = progression.levels[4]?.upgradeToNext;
      for (const cost of [level1Cost, level2Cost, level3Cost, level4Cost, level5Cost]) {
        expect(cost?.silver).toBeGreaterThan(0);
        expect(cost?.requirements.length).toBeGreaterThan(0);
      }
      expect(level1Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t3"))).toBe(true);
      expect(level2Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t4"))).toBe(true);
      expect(level3Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t5"))).toBe(true);
      expect(level4Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t6"))).toBe(true);
      expect(level5Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t7"))).toBe(true);
      expect(progression.levels[5]?.upgradeToNext).toBeUndefined();
    }
  });
});
