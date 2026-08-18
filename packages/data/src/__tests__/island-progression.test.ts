import { describe, expect, it } from "vitest";
import {
  ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS,
  getIslandBuildingMaxProductionTier,
} from "../config/island-progression.js";

describe("island operational progression", () => {
  it("maps building levels 1-4 to production tiers T3-T6", () => {
    for (const progression of ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS) {
      expect(progression.levels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
      expect(progression.levels.map((level) => level.maxProductionTier)).toEqual([3, 4, 5, 6]);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 1)).toBe(3);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 2)).toBe(4);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 3)).toBe(5);
      expect(getIslandBuildingMaxProductionTier(progression.buildingId, 4)).toBe(6);
    }
  });

  it("charges each upgrade with the refined tier immediately below its unlock", () => {
    for (const progression of ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS) {
      const level1Cost = progression.levels[0]?.upgradeToNext;
      const level2Cost = progression.levels[1]?.upgradeToNext;
      const level3Cost = progression.levels[2]?.upgradeToNext;
      expect(level1Cost?.silver).toBeGreaterThan(0);
      expect(level2Cost?.silver).toBeGreaterThan(0);
      expect(level3Cost?.silver).toBeGreaterThan(0);
      expect(level1Cost?.requirements.length).toBeGreaterThan(0);
      expect(level2Cost?.requirements.length).toBeGreaterThan(0);
      expect(level3Cost?.requirements.length).toBeGreaterThan(0);
      expect(level1Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t3"))).toBe(true);
      expect(level2Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t4"))).toBe(true);
      expect(level3Cost?.requirements.every((requirement) => requirement.itemId.endsWith("_t5"))).toBe(true);
      expect(progression.levels[3]?.upgradeToNext).toBeUndefined();
    }
  });
});
