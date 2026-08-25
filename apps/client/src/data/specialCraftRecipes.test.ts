import { describe, expect, it } from "vitest";
import {
  DUNGEON_ARTIFACT_FACTIONS,
  DUNGEON_ARTIFACT_TIERS,
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
} from "@game/data";
import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  KEY_FRAGMENTS_PER_KEY,
} from "./economyContentCatalog";
import {
  getFragmentAssemblyRecipe,
  SPECIAL_CRAFT_RECIPES,
} from "./specialCraftRecipes";

describe("special crafting conversions", () => {
  it("creates key conversions at the approved 50 fragment cost", () => {
    const keyRecipes = SPECIAL_CRAFT_RECIPES.filter((recipe) =>
      recipe.outputItemId.includes("dungeon_key"),
    );

    expect(keyRecipes).toHaveLength(5);
    for (const recipe of keyRecipes) {
      expect(recipe.family).toBe("other_key");
      expect(recipe.requirements).toHaveLength(1);
      expect(recipe.requirements[0]?.quantity).toBe(KEY_FRAGMENTS_PER_KEY);
      expect(recipe.requirements[0]?.itemId).toContain("key_fragment");
    }
  });

  it("creates artifact conversions at the approved 200 fragment cost", () => {
    const artifactRecipes = SPECIAL_CRAFT_RECIPES.filter((recipe) =>
      recipe.family === "other_artifact",
    );

    expect(artifactRecipes).toHaveLength(
      DUNGEON_ARTIFACT_TIERS.length * DUNGEON_ARTIFACT_FACTIONS.length,
    );
    for (const recipe of artifactRecipes) {
      expect(recipe.requirements).toHaveLength(1);
      expect(recipe.requirements[0]?.quantity).toBe(ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE);
      expect(recipe.requirements[0]?.itemId).toContain("artifact_fragment");
    }
  });

  it("resolves assembly directly from the authored fragment requirement", () => {
    for (const recipe of SPECIAL_CRAFT_RECIPES) {
      const fragmentId = recipe.requirements[0]?.itemId;
      expect(fragmentId).toBeDefined();
      expect(getFragmentAssemblyRecipe(fragmentId ?? "")).toBe(recipe);
    }
    expect(getFragmentAssemblyRecipe("item_resource_wood_t4")).toBeUndefined();
  });

  it("covers every authored faction artifact conversion from T4 to T8", () => {
    for (const tier of DUNGEON_ARTIFACT_TIERS) {
      for (const faction of DUNGEON_ARTIFACT_FACTIONS) {
        const fragmentItemId = getDungeonArtifactFragmentItemId(faction, tier);
        const outputItemId = getDungeonArtifactItemId(faction, tier);
        const recipe = getFragmentAssemblyRecipe(fragmentItemId);

        expect(recipe).toBeDefined();
        expect(recipe?.family).toBe("other_artifact");
        expect(recipe?.tier).toBe(tier);
        expect(recipe?.outputItemId).toBe(outputItemId);
        expect(recipe?.requirements).toEqual([
          {
            itemId: fragmentItemId,
            quantity: ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
          },
        ]);
      }
    }
  });
});
