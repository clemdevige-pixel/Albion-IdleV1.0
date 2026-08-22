import { describe, expect, it } from "vitest";
import {
  ACADEMY_LEVELS,
  getAcademyResearchTier,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getIslandUpgradeableLevelDefinition,
} from "../index.js";

describe("Academy island contract", () => {
  it("unlocks utility buildings at island level 2, not level 1", () => {
    expect(getIslandLevelDefinition(1)?.unlockedCategories).not.toContain("utility");
    expect(getIslandLevelDefinition(2)?.unlockedCategories).toContain("utility");
  });

  it("authors the validated academy construction cost", () => {
    const academy = getIslandBuildingDefinition("academy");
    expect(academy.category).toBe("utility");
    expect(academy.construction).toEqual({
      silver: 500,
      requirements: [
        { itemId: "item_refined_planks_t3", quantity: 12 },
        { itemId: "item_refined_copper_bar_t3", quantity: 8 },
        { itemId: "item_refined_cloth_t3", quantity: 4 },
      ],
    });
  });

  it("authors one academy level per Research tier T4-T8 and offsets it from Island Level", () => {
    expect(ACADEMY_LEVELS.map(({ level, researchTier, minimumIslandLevel }) => [
      level,
      researchTier,
      minimumIslandLevel,
    ])).toEqual([
      [1, 4, 2],
      [2, 5, 3],
      [3, 6, 4],
      [4, 7, 5],
      [5, 8, 6],
    ]);
    for (const level of ACADEMY_LEVELS) {
      expect(getAcademyResearchTier(level.level)).toBe(level.researchTier);
      expect(getIslandUpgradeableLevelDefinition("academy", level.level)).toMatchObject({
        level: level.level,
        displayTier: level.researchTier,
        minimumIslandLevel: level.minimumIslandLevel,
      });
    }
  });

  it("keeps academy upgrade materials at half the Workshop per-family curve", () => {
    expect(ACADEMY_LEVELS.map((level) => {
      const upgradeToNext = "upgradeToNext" in level ? level.upgradeToNext : undefined;
      return [
        level.researchTier,
        upgradeToNext?.silver,
        upgradeToNext?.requirements.map((requirement) => requirement.quantity),
      ];
    })).toEqual([
      [4, 5_000, [5, 5, 5, 5]],
      [5, 18_000, [9, 9, 9, 9]],
      [6, 50_000, [14, 14, 14, 14]],
      [7, 85_000, [20, 20, 20, 20]],
      [8, undefined, undefined],
    ]);
  });
});
