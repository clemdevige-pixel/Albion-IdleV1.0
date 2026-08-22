import { describe, expect, it } from "vitest";
import {
  getIslandBuildingDefinition,
  getIslandBuildingMaxProductionTier,
  getIslandLevelDefinition,
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

  it("starts as a T4 academy without authoring future upgrade costs", () => {
    expect(getIslandBuildingMaxProductionTier("academy", 1)).toBe(4);
    expect(getIslandBuildingMaxProductionTier("academy", 2)).toBeUndefined();
  });
});
