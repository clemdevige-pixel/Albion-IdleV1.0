import { describe, expect, it } from "vitest";
import type { CraftingRecipeVM } from "../../../game/GameBridge";
import { buildCraftingModel } from "./craftingModels";

function recipe(
  outputItemId: string,
  tier: CraftingRecipeVM["tier"],
  family: CraftingRecipeVM["family"] = "armor",
): CraftingRecipeVM {
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

describe("buildCraftingModel", () => {
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

  it("resolves existing weapon-family presentation without UI-owned family lists", () => {
    const model = buildCraftingModel({
      tier: 3,
      recipes: [
        recipe("item_weapon_sword_t3_broadsword", 3, "sword"),
        recipe("item_weapon_bow_t3_longbow", 3, "bow"),
      ],
    });

    const weapons = model.categories.find((category) => category.id === "weapons");
    expect(weapons?.families.map((family) => [family.id, family.label])).toEqual([
      ["sword", "Épées"],
      ["bow", "Arcs"],
    ]);
  });

  it("splits Autre into Clé and Artefact families", () => {
    const model = buildCraftingModel({
      tier: 4,
      recipes: [
        recipe("item_resource_dungeon_key_t4", 4, "other_key"),
        recipe("item_resource_artifact_morgana", 4, "other_artifact"),
        recipe("item_resource_artifact_keeper", 4, "other_artifact"),
      ],
    });

    const other = model.categories.find((category) => category.id === "other");
    expect(other?.label).toBe("Autre");
    expect(other?.families.map((family) => [family.id, family.label])).toEqual([
      ["other_key", "Clé"],
      ["other_artifact", "Artefact"],
    ]);
    expect(other?.families[0]?.recipes).toHaveLength(1);
    expect(other?.families[1]?.recipes).toHaveLength(2);
  });

  it("filters key and artifact conversions by selected production tier", () => {
    const recipes = [
      recipe("item_resource_dungeon_key_t4", 4, "other_key"),
      recipe("item_resource_dungeon_key_t5", 5, "other_key"),
      recipe("item_resource_artifact_keeper", 4, "other_artifact"),
      recipe("item_resource_artifact_keeper_t5", 5, "other_artifact"),
      recipe("item_weapon_sword_t4_broadsword", 4, "sword"),
      recipe("item_weapon_sword_t5_broadsword", 5, "sword"),
    ];

    const t4Model = buildCraftingModel({ tier: 4, recipes });
    const t5Model = buildCraftingModel({ tier: 5, recipes });
    const t4Other = t4Model.categories.find((category) => category.id === "other");
    const t5Other = t5Model.categories.find((category) => category.id === "other");

    expect(t4Other?.families.flatMap((family) => family.recipes.map((entry) => entry.outputItemId))).toEqual([
      "item_resource_dungeon_key_t4",
      "item_resource_artifact_keeper",
    ]);
    expect(t5Other?.families.flatMap((family) => family.recipes.map((entry) => entry.outputItemId))).toEqual([
      "item_resource_dungeon_key_t5",
      "item_resource_artifact_keeper_t5",
    ]);

    expect(t4Model.categories.find((category) => category.id === "weapons")?.families[0]?.recipes.map((entry) => entry.outputItemId)).toEqual([
      "item_weapon_sword_t4_broadsword",
    ]);
    expect(t5Model.categories.find((category) => category.id === "weapons")?.families[0]?.recipes.map((entry) => entry.outputItemId)).toEqual([
      "item_weapon_sword_t5_broadsword",
    ]);
  });

  it("accepts a new family ID without changing GameBridge or craftingModels unions", () => {
    const model = buildCraftingModel({
      tier: 3,
      recipes: [recipe("item_weapon_hammer_t3_test", 3, "hammer")],
    });

    const weapons = model.categories.find((category) => category.id === "weapons");
    expect(weapons?.families).toHaveLength(1);
    expect(weapons?.families[0]).toMatchObject({
      id: "hammer",
      label: "hammer",
      symbol: "◆",
    });
  });
});
