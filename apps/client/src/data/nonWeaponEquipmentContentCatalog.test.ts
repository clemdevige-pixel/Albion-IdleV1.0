import { describe, expect, it } from "vitest";
import {
  PROGRESSION_EQUIPMENT_CONTENT,
  PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS,
  resolvePreviousProgressionEquipmentItemId,
} from "./nonWeaponEquipmentContentCatalog";
import {
  EQUIPMENT_CRAFT_RECIPES,
  STANDARD_NON_WEAPON_CRAFT_RECIPES,
} from "./refiningRecipes";

describe("non-weapon equipment content catalog", () => {
  it("derives one item definition and one recipe for every authored progression item", () => {
    const authoredItemCount = PROGRESSION_EQUIPMENT_CONTENT.reduce(
      (count, family) => count + family.items.length,
      0,
    );

    expect(Object.keys(PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS)).toHaveLength(authoredItemCount);
    expect(STANDARD_NON_WEAPON_CRAFT_RECIPES).toHaveLength(authoredItemCount);

    for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
      for (const item of family.items) {
        expect(PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS[item.itemId]?.stats).toEqual(item.stats);
        expect(
          STANDARD_NON_WEAPON_CRAFT_RECIPES.some((recipe) => recipe.outputItemId === item.itemId),
        ).toBe(true);
        expect(
          EQUIPMENT_CRAFT_RECIPES.some((recipe) => recipe.outputItemId === item.itemId),
        ).toBe(true);
      }
    }
  });

  it("derives Tn predecessor requirements from equipment families", () => {
    for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
      for (const item of family.items) {
        const recipe = STANDARD_NON_WEAPON_CRAFT_RECIPES.find(
          (candidate) => candidate.outputItemId === item.itemId,
        );
        expect(recipe).toBeDefined();

        const predecessor = resolvePreviousProgressionEquipmentItemId(item.itemId);
        if (item.tier === 3) {
          expect(predecessor).toBeUndefined();
          continue;
        }

        expect(predecessor).toBeDefined();
        expect(recipe?.requirements).toContainEqual({ itemId: predecessor, quantity: 1 });
      }
    }
  });

  it("preserves the currently authored T5 material costs", () => {
    const byOutput = new Map(
      STANDARD_NON_WEAPON_CRAFT_RECIPES.map((recipe) => [recipe.outputItemId, recipe]),
    );

    expect(byOutput.get("item_shield_t5_reinforced")?.requirements).toEqual([
      { itemId: "item_refined_planks_t5", quantity: 5 },
      { itemId: "item_refined_metal_bar_t5", quantity: 5 },
      { itemId: "item_refined_leather_t5", quantity: 3 },
      { itemId: "item_shield_t4_reinforced", quantity: 1 },
    ]);
    expect(byOutput.get("item_armor_t5_leather")?.requirements).toEqual([
      { itemId: "item_refined_planks_t5", quantity: 2 },
      { itemId: "item_refined_metal_bar_t5", quantity: 2 },
      { itemId: "item_refined_leather_t5", quantity: 4 },
      { itemId: "item_refined_cloth_t5", quantity: 3 },
      { itemId: "item_armor_t4_leather", quantity: 1 },
    ]);
  });
});