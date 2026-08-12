import { describe, expect, it } from "vitest";
import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  KEY_FRAGMENTS_PER_KEY,
} from "./economyContentCatalog";
import { SPECIAL_CRAFT_RECIPES } from "./specialCraftRecipes";

describe("special crafting conversions", () => {
  it("creates key conversions at the approved 50 fragment cost", () => {
    const keyRecipes = SPECIAL_CRAFT_RECIPES.filter((recipe) =>
      recipe.outputItemId.includes("dungeon_key"),
    );

    expect(keyRecipes).toHaveLength(5);
    for (const recipe of keyRecipes) {
      expect(recipe.family).toBe("other");
      expect(recipe.requirements).toHaveLength(1);
      expect(recipe.requirements[0]?.quantity).toBe(KEY_FRAGMENTS_PER_KEY);
      expect(recipe.requirements[0]?.itemId).toContain("key_fragment");
    }
  });

  it("creates artifact conversions at the approved 200 fragment cost", () => {
    const artifactRecipes = SPECIAL_CRAFT_RECIPES.filter((recipe) =>
      recipe.outputItemId.includes("artifact_")
      && !recipe.outputItemId.includes("fragment"),
    );

    expect(artifactRecipes).toHaveLength(5);
    for (const recipe of artifactRecipes) {
      expect(recipe.family).toBe("other");
      expect(recipe.requirements).toHaveLength(1);
      expect(recipe.requirements[0]?.quantity).toBe(ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE);
      expect(recipe.requirements[0]?.itemId).toContain("artifact_fragment");
    }
  });

  it("keeps conversions aligned with Blue Zone faction tiers", () => {
    const tier3Outputs = SPECIAL_CRAFT_RECIPES
      .filter((recipe) => recipe.tier === 3)
      .map((recipe) => recipe.outputItemId);
    const tier4Outputs = SPECIAL_CRAFT_RECIPES
      .filter((recipe) => recipe.tier === 4)
      .map((recipe) => recipe.outputItemId);

    expect(tier3Outputs.some((id) => id.endsWith("morgana"))).toBe(true);
    expect(tier3Outputs.some((id) => id.endsWith("undead"))).toBe(true);
    expect(tier4Outputs.some((id) => id.endsWith("keeper"))).toBe(true);
    expect(tier4Outputs.some((id) => id.endsWith("heretic"))).toBe(true);
  });
});
