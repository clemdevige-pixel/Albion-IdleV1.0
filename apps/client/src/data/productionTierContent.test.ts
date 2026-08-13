import { describe, expect, it } from "vitest";
import {
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
  getProductionTierRules,
} from "./productionFamilyCatalog.js";
import { RESOURCE_TIER_CONTENT } from "./resourceContentCatalog.js";
import {
  EQUIPMENT_CRAFT_RECIPES,
  getProductionRefiningRecipe,
} from "./refiningRecipes.js";

describe("production tier content contract", () => {
  it("keeps every authored tier complete across gathering and refining", () => {
    expect(PRODUCTION_CONTENT_TIERS).toContain(5);

    for (const familyId of PRODUCTION_FAMILY_IDS) {
      const family = getProductionFamilyDefinition(familyId);

      for (const tier of PRODUCTION_CONTENT_TIERS) {
        const presentation = family.tiers[tier];
        const resource = RESOURCE_TIER_CONTENT[familyId][tier];
        const refining = getProductionRefiningRecipe(familyId, tier);

        expect(presentation, `${familyId} T${String(tier)} presentation`).toBeDefined();
        expect(resource, `${familyId} T${String(tier)} gathering content`).toBeDefined();
        expect(getProductionTierRules(tier).gatheringBaseTicks).toBeGreaterThan(0);
        expect(refining.tier).toBe(tier);
        expect(refining.rawItemId).toContain(`_t${String(tier)}`);
        expect(refining.outputItemId).toContain(`_t${String(tier)}`);
      }
    }
  });

  it("requires the previous refined tier when refining T5", () => {
    for (const familyId of PRODUCTION_FAMILY_IDS) {
      const recipe = getProductionRefiningRecipe(familyId, 5);
      expect(recipe.requirements.some((entry) => entry.itemId.endsWith("_t4"))).toBe(true);
      expect(recipe.requirements.some((entry) => entry.itemId.endsWith("_t5"))).toBe(true);
    }
  });

  it("exposes a T5 craft recipe for each standard weapon and armor family", () => {
    const t5Recipes = EQUIPMENT_CRAFT_RECIPES.filter((recipe) => recipe.tier === 5);
    expect(t5Recipes.map((recipe) => recipe.outputItemId)).toEqual(expect.arrayContaining([
      "item_weapon_sword_t5_broadsword",
      "item_weapon_bow_t5_longbow",
      "item_weapon_staff_t5_infernal",
      "item_weapon_gloves_t5_spiked_gauntlets",
      "item_weapon_dagger_t5_pair",
      "item_shield_t5_reinforced",
      "item_helmet_t5_reinforced",
      "item_armor_t5_leather",
      "item_boots_t5_leather",
    ]));
    expect(t5Recipes).toHaveLength(9);
  });
});
