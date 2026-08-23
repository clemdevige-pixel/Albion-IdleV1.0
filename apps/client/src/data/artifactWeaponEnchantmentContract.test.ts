import { describe, expect, it } from "vitest";
import { ARTIFACT_WEAPON_CRAFT_RECIPES } from "./artifactWeaponCraftRecipes.js";
import { resolveEnchantmentItemInfo } from "./itemContentCatalog.js";

describe("artifact weapon enchantment craft contract", () => {
  it("makes every T4-T8 artifact weapon genuinely enchantable in runtime benchmarks", () => {
    for (const recipe of ARTIFACT_WEAPON_CRAFT_RECIPES) {
      const info = resolveEnchantmentItemInfo(recipe.outputItemId);
      expect(info, recipe.outputItemId).toBeDefined();
      expect(info?.enchantable, recipe.outputItemId).toBe(true);
      expect(info?.maximumLevel, recipe.outputItemId).toBe(3);

      const runeRequirement = recipe.requirements.find((requirement) =>
        requirement.itemId.startsWith("item_resource_rune_"),
      );
      expect(info?.craftMaterials, `${recipe.outputItemId}: enchant material basis`).toContainEqual(
        runeRequirement,
      );
    }
  });
});
