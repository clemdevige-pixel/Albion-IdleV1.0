import { describe, expect, it } from "vitest";
import type { CraftingRecipeVM } from "../../../game/GameBridge";
import { buildCraftingModel } from "./craftingModels";

function recipe(
  outputItemId: string,
  tier: 3 | 4,
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
      tier: 3,
      recipes: [
        recipe("item_resource_dungeon_key_morgana", 3, "other_key"),
        recipe("item_resource_dungeon_key_undead", 3, "other_key"),
        recipe("item_resource_artifact_morgana", 3, "other_artifact"),
      ],
    });

    const other = model.categories.find((category) => category.id === "other");
    expect(other?.label).toBe("Autre");
    expect(other?.families.map((family) => [family.id, family.label])).toEqual([
      ["other_key", "Clé"],
      ["other_artifact", "Artefact"],
    ]);
    expect(other?.families[0]?.recipes).toHaveLength(2);
    expect(other?.families[1]?.recipes).toHaveLength(1);
  });

  it("keeps key and artifact conversions available regardless of selected production tier", () => {
    const recipes = [
      recipe("item_resource_dungeon_key_morgana", 3, "other_key"),
      recipe("item_resource_dungeon_key_keeper", 4, "other_key"),
      recipe("item_resource_artifact_morgana", 3, "other_artifact"),
      recipe("item_resource_artifact_keeper", 4, "other_artifact"),
      recipe("item_weapon_sword_t3_broadsword", 3, "sword"),
      recipe("item_weapon_sword_t4_broadsword", 4, "sword"),
    ];

    const t3Model = buildCraftingModel({ tier: 3, recipes });
    const t4Model = buildCraftingModel({ tier: 4, recipes });
    const t3Other = t3Model.categories.find((category) => category.id === "other");
    const t4Other = t4Model.categories.find((category) => category.id === "other");

    expect(t3Other?.families.flatMap((family) => family.recipes.map((entry) => entry.outputItemId))).toEqual([
      "item_resource_dungeon_key_morgana",
      "item_resource_dungeon_key_keeper",
      "item_resource_artifact_morgana",
      "item_resource_artifact_keeper",
    ]);
    expect(t4Other?.families.flatMap((family) => family.recipes.map((entry) => entry.outputItemId))).toEqual([
      "item_resource_dungeon_key_morgana",
      "item_resource_dungeon_key_keeper",
      "item_resource_artifact_morgana",
      "item_resource_artifact_keeper",
    ]);

    expect(t3Model.categories.find((category) => category.id === "weapons")?.families[0]?.recipes.map((entry) => entry.outputItemId)).toEqual([
      "item_weapon_sword_t3_broadsword",
    ]);
    expect(t4Model.categories.find((category) => category.id === "weapons")?.families[0]?.recipes.map((entry) => entry.outputItemId)).toEqual([
      "item_weapon_sword_t4_broadsword",
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
