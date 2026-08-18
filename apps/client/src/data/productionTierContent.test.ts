import { describe, expect, it } from "vitest";
import { CRAFTING_CONTENT_TIERS, GATHERING_CONTENT_TIERS, PRODUCTION_CONTENT_TIERS, REFINING_CONTENT_TIERS, PRODUCTION_FAMILY_IDS, getProductionFamilyDefinition, getProductionTierRules } from "./productionFamilyCatalog.js";
import { RESOURCE_TIER_CONTENT } from "./resourceContentCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES, getProductionRefiningRecipe } from "./refiningRecipes.js";

describe("production tier content contract", () => {
  it("keeps every authored gathering tier complete without requiring refining rollout", () => {
    expect(GATHERING_CONTENT_TIERS).toContain(7);
    for (const familyId of PRODUCTION_FAMILY_IDS) {
      const family = getProductionFamilyDefinition(familyId);
      for (const tier of GATHERING_CONTENT_TIERS) {
        const presentation = family.tiers[tier]; const resource = RESOURCE_TIER_CONTENT[familyId][tier];
        expect(presentation, `${familyId} T${String(tier)} presentation`).toBeDefined();
        expect(resource, `${familyId} T${String(tier)} gathering content`).toBeDefined();
        expect(resource?.rawItemId).toContain(`_t${String(tier)}`);
        expect(getProductionTierRules(tier).gatheringBaseTicks).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every authored refining tier complete without requiring craft rollout", () => {
    expect(REFINING_CONTENT_TIERS).toContain(7);
    for (const familyId of PRODUCTION_FAMILY_IDS) {
      for (const tier of REFINING_CONTENT_TIERS) {
        const resource = RESOURCE_TIER_CONTENT[familyId][tier]; const refining = getProductionRefiningRecipe(familyId, tier);
        expect(resource, `${familyId} T${String(tier)} gathering content`).toBeDefined();
        expect(refining.tier).toBe(tier); expect(refining.rawItemId).toBe(resource?.rawItemId); expect(refining.outputItemId).toContain(`_t${String(tier)}`);
        if (tier > 3) expect(refining.requirements.some((entry) => entry.itemId.endsWith(`_t${String(tier - 1)}`)), `${familyId} T${String(tier)} should consume previous refined tier`).toBe(true);
        expect(refining.requirements.some((entry) => entry.itemId.endsWith(`_t${String(tier)}`)), `${familyId} T${String(tier)} should consume current raw tier`).toBe(true);
      }
    }
  });

  it("keeps worker/full production rollout independent from refining and crafting rollout", () => {
    expect(PRODUCTION_CONTENT_TIERS).toEqual([3, 4, 5]);
    expect(REFINING_CONTENT_TIERS).toEqual([3, 4, 5, 6, 7]);
    expect(CRAFTING_CONTENT_TIERS).toEqual([3, 4, 5, 6, 7]);
  });

  it("exposes conventional T7 weapon and armor recipes with T6 predecessors", () => {
    const highestCraftingTier = Math.max(...CRAFTING_CONTENT_TIERS);
    const recipes = EQUIPMENT_CRAFT_RECIPES.filter((recipe) => recipe.tier === highestCraftingTier);
    expect(highestCraftingTier).toBe(7);
    expect(recipes.map((recipe) => recipe.outputItemId)).toEqual(expect.arrayContaining(["item_weapon_sword_t7_broadsword", "item_weapon_bow_t7_longbow", "item_weapon_staff_t7_infernal", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_dagger_t7_pair", "item_shield_t7_reinforced", "item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather"]));
    expect(recipes).toHaveLength(9);
    for (const recipe of recipes) {
      expect(recipe.requirements.some((entry) => entry.itemId.includes("_t6_") || entry.itemId.endsWith("_t6")), `${recipe.outputItemId} should consume its T6 predecessor`).toBe(true);
    }
  });
});
