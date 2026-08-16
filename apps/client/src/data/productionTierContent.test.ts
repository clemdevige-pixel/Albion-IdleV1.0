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

  it("requires the previous refined tier for every authored tier after T3", () => {
    for (const familyId of PRODUCTION_FAMILY_IDS) {
      for (const tier of PRODUCTION_CONTENT_TIERS) {
        if (tier === 3) continue;
        const recipe = getProductionRefiningRecipe(familyId, tier);
        expect(
          recipe.requirements.some((entry) => entry.itemId.endsWith(`_t${String(tier - 1)}`)),
          `${familyId} T${String(tier)} should consume previous refined tier`,
        ).toBe(true);
        expect(
          recipe.requirements.some((entry) => entry.itemId.endsWith(`_t${String(tier)}`)),
          `${familyId} T${String(tier)} should consume current raw tier`,
        ).toBe(true);
      }
    }
  });

  it("exposes standard weapon and armor recipes for the highest authored tier", () => {
    const highestAuthoredTier = Math.max(...PRODUCTION_CONTENT_TIERS);
    const recipes = EQUIPMENT_CRAFT_RECIPES.filter(
      (recipe) => recipe.tier === highestAuthoredTier,
    );

    expect(recipes.map((recipe) => recipe.outputItemId)).toEqual(expect.arrayContaining([
      `item_weapon_sword_t${String(highestAuthoredTier)}_broadsword`,
      `item_weapon_bow_t${String(highestAuthoredTier)}_longbow`,
      `item_weapon_staff_t${String(highestAuthoredTier)}_infernal`,
      `item_weapon_gloves_t${String(highestAuthoredTier)}_spiked_gauntlets`,
      `item_weapon_dagger_t${String(highestAuthoredTier)}_pair`,
      `item_shield_t${String(highestAuthoredTier)}_reinforced`,
      `item_helmet_t${String(highestAuthoredTier)}_reinforced`,
      `item_armor_t${String(highestAuthoredTier)}_leather`,
      `item_boots_t${String(highestAuthoredTier)}_leather`,
    ]));
    expect(recipes).toHaveLength(9);
  });
});
