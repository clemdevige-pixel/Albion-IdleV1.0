import { describe, expect, it } from "vitest";
import {
  ARTIFACT_WEAPON_CRAFT_RECIPES,
  ARTIFACT_WEAPON_RUNE_COST_BY_TIER,
} from "./artifactWeaponCraftRecipes.js";
import { STANDARD_WEAPON_CRAFT_RECIPES } from "./refiningRecipes.js";

describe("faction artifact weapon crafting", () => {
  it("authors one T4-T8 recipe for every faction artifact weapon", () => {
    expect(ARTIFACT_WEAPON_CRAFT_RECIPES).toHaveLength(100);
    expect(new Set(ARTIFACT_WEAPON_CRAFT_RECIPES.map((recipe) => recipe.outputItemId)).size)
      .toBe(100);
  });

  it("reuses family refined materials and adds exactly one artifact plus tier-scaled runes", () => {
    for (const recipe of ARTIFACT_WEAPON_CRAFT_RECIPES) {
      const baseRecipe = STANDARD_WEAPON_CRAFT_RECIPES.find((candidate) => (
        candidate.family === recipe.family && candidate.tier === recipe.tier
      ));
      expect(baseRecipe, `${recipe.outputItemId}: standard family recipe`).toBeDefined();

      const refinedRequirements = recipe.requirements.filter((requirement) =>
        requirement.itemId.startsWith("item_refined_"),
      );
      expect(refinedRequirements, `${recipe.outputItemId}: refined requirements`)
        .toEqual(baseRecipe?.requirements ?? []);

      const artifactRequirements = recipe.requirements.filter((requirement) =>
        requirement.itemId.startsWith("item_resource_artifact_")
        && !requirement.itemId.includes("fragment"),
      );
      expect(artifactRequirements, `${recipe.outputItemId}: artifact requirement`).toHaveLength(1);
      expect(artifactRequirements[0]?.quantity, `${recipe.outputItemId}: artifact quantity`).toBe(1);

      const runeRequirements = recipe.requirements.filter((requirement) =>
        requirement.itemId.startsWith("item_resource_rune_"),
      );
      expect(runeRequirements, `${recipe.outputItemId}: rune requirement`).toHaveLength(1);
      expect(runeRequirements[0]?.quantity, `${recipe.outputItemId}: rune quantity`)
        .toBe(ARTIFACT_WEAPON_RUNE_COST_BY_TIER[recipe.tier]);

      expect(
        recipe.requirements.some((requirement) => requirement.itemId.startsWith("item_weapon_")),
        `${recipe.outputItemId}: predecessor weapon requirement`,
      ).toBe(false);
    }
  });
});
