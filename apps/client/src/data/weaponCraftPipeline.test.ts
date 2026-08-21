import { describe, expect, it } from "vitest";
import {
  BADON_TEMPORARY_RECIPE,
  STANDARD_WEAPON_CRAFT_RECIPES,
} from "./refiningRecipes.js";
import {
  resolvePreviousWeaponTierItemId,
  resolveWeaponCraftRule,
  resolveWeaponTier,
} from "./weaponContentCatalog.js";

const STANDARD_SPECIALIZATIONS = [
  ["item_weapon_sword_t3_broadsword", "item_weapon_sword_t4_broadsword", "item_weapon_sword_t5_broadsword", "item_weapon_sword_t6_broadsword", "item_weapon_sword_t7_broadsword", "item_weapon_sword_t8_broadsword"],
  ["item_weapon_bow_t3_longbow", "item_weapon_bow_t4_longbow", "item_weapon_bow_t5_longbow", "item_weapon_bow_t6_longbow", "item_weapon_bow_t7_longbow", "item_weapon_bow_t8_longbow"],
  ["item_weapon_staff_t3_infernal", "item_weapon_staff_t4_infernal", "item_weapon_staff_t5_infernal", "item_weapon_staff_t6_infernal", "item_weapon_staff_t7_infernal", "item_weapon_staff_t8_infernal"],
  ["item_weapon_gloves_t3_spiked_gauntlets", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_gloves_t5_spiked_gauntlets", "item_weapon_gloves_t6_spiked_gauntlets", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_gloves_t8_spiked_gauntlets"],
  ["item_weapon_dagger_t3_pair", "item_weapon_dagger_t4_pair", "item_weapon_dagger_t5_pair", "item_weapon_dagger_t6_pair", "item_weapon_dagger_t7_pair", "item_weapon_dagger_t8_pair"],
] as const;

describe("weapon craft pipeline", () => {
  it("keeps every standard weapon recipe resource-only", () => {
    for (const specialization of STANDARD_SPECIALIZATIONS) {
      for (const itemId of specialization) {
        const tier = resolveWeaponTier(itemId);
        expect(tier).toBeDefined();
        expect(resolveWeaponCraftRule(itemId)?.kind).toBe("standard");

        const recipe = STANDARD_WEAPON_CRAFT_RECIPES.find(
          (entry) => entry.outputItemId === itemId,
        );
        expect(recipe).toBeDefined();
        expect(recipe?.requirements.every((entry) =>
          entry.itemId.startsWith("item_refined_"),
        )).toBe(true);
        expect(recipe?.requirements.some((entry) =>
          entry.itemId.startsWith("item_weapon_"),
        )).toBe(false);
        expect(recipe?.requirements.some((entry) =>
          entry.itemId.endsWith(`_t${String(tier)}`),
        )).toBe(true);
      }
    }
  });

  it("keeps tier topology resolvable without consuming predecessors in recipes", () => {
    for (const specialization of STANDARD_SPECIALIZATIONS) {
      for (const [offset, itemId] of specialization.slice(1).entries()) {
        const previousItemId = specialization[offset];
        if (previousItemId === undefined) {
          throw new Error(`Missing predecessor topology for ${itemId}`);
        }

        expect(resolvePreviousWeaponTierItemId(itemId)).toBe(previousItemId);

        const recipe = STANDARD_WEAPON_CRAFT_RECIPES.find(
          (entry) => entry.outputItemId === itemId,
        );
        expect(recipe).toBeDefined();
        expect(recipe?.requirements.some((entry) => entry.itemId === previousItemId)).toBe(false);
      }
    }
  });

  it("keeps Badon outside the standard generator", () => {
    const badonId = "item_weapon_bow_t4_badon";
    expect(resolveWeaponCraftRule(badonId)?.kind).toBe("artifact_pending");
    expect(resolvePreviousWeaponTierItemId(badonId)).toBeUndefined();
    expect(STANDARD_WEAPON_CRAFT_RECIPES.some(
      (entry) => entry.outputItemId === badonId,
    )).toBe(false);
    expect(BADON_TEMPORARY_RECIPE.outputItemId).toBe(badonId);
    expect(BADON_TEMPORARY_RECIPE.requirements.some((entry) =>
      entry.itemId.startsWith("item_weapon_"),
    )).toBe(false);
  });

  it("does not generate duplicate standard weapon outputs", () => {
    const outputIds = STANDARD_WEAPON_CRAFT_RECIPES.map((entry) => entry.outputItemId);
    expect(new Set(outputIds).size).toBe(outputIds.length);
  });
});