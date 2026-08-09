import { describe, expect, it } from "vitest";
import type { CraftingRecipeVM } from "../../../game/GameBridge";
import { buildCraftingModel } from "./craftingModels";

function recipe(
  outputItemId: string,
  tier: 3 | 4,
): CraftingRecipeVM {
  return {
    family: "armor",
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

describe("buildCraftingModel armor hierarchy", () => {
  it("groups armor recipes into Tête, Torse and Pied", () => {
    const model = buildCraftingModel({
      tier: 3,
      recipes: [
        recipe("item_iron_helmet", 3),
        recipe("item_leather_armor", 3),
        recipe("item_leather_boots", 3),
      ],
    });

    const armors = model.categories.find((category) => category.id === "armors");
    expect(armors?.families.map((family) => family.label)).toEqual([
      "Tête",
      "Torse",
      "Pied",
    ]);
    expect(armors?.families.map((family) => family.recipes.length)).toEqual([1, 1, 1]);
  });
});
