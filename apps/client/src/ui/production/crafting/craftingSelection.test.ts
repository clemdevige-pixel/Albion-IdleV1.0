import { describe, expect, it } from "vitest";
import type { CraftingRecipeVM } from "../../../game/GameBridge";
import { buildCraftingModel, resolveCraftingSelectionKey } from "./craftingModels";

function recipe(outputItemId: string, tier: CraftingRecipeVM["tier"], family: string): CraftingRecipeVM {
  return {
    family,
    recipeName: outputItemId,
    outputItemId,
    tier,
    itemPower: tier * 100,
    plankRequired: 0,
    barRequired: 0,
    plankAvailable: 0,
    barAvailable: 0,
    plankItemId: "",
    barItemId: "",
    requirements: [],
    craftedQuantity: 0,
    canCraft: false,
  };
}

describe("crafting tier selection", () => {
  it("keeps one weapon specialization identity across tiers", () => {
    expect(resolveCraftingSelectionKey(recipe("item_weapon_sword_t3_broadsword", 3, "sword")))
      .toBe(resolveCraftingSelectionKey(recipe("item_weapon_sword_t4_broadsword", 4, "sword")));
  });

  it("uses the same authored cape order on every tier", () => {
    const recipes = [
      recipe("item_cape_t4_keeper", 4, "cape"),
      recipe("item_cape_t5_morgana", 5, "cape"),
      recipe("item_cape_t4_morgana", 4, "cape"),
      recipe("item_cape_t5_keeper", 5, "cape"),
    ];
    const keys = (tier: 4 | 5) => buildCraftingModel({ tier, recipes })
      .categories.find((category) => category.id === "armors")
      ?.families.find((family) => family.id === "armor_cape")
      ?.recipes.map((entry) => entry.selectionKey);

    expect(keys(4)).toEqual(["cape:keeper", "cape:morgana"]);
    expect(keys(5)).toEqual(keys(4));
  });
});
