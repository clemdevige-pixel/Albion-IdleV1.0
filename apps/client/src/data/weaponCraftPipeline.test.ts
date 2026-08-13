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
  ["item_weapon_sword_t3_broadsword", "item_weapon_sword_t4_broadsword", "item_weapon_sword_t5_broadsword"],
  ["item_weapon_bow_t3_longbow", "item_weapon_bow_t4_longbow", "item_weapon_bow_t5_longbow"],
  ["item_weapon_staff_t3_infernal", "item_weapon_staff_t4_infernal", "item_weapon_staff_t5_infernal"],
  ["item_weapon_gloves_t3_spiked_gauntlets", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_gloves_t5_spiked_gauntlets"],
] as const;

describe("weapon craft pipeline", () => {
  it("keeps T3 standard recipes resource-only", () => {
    for (const [t3ItemId] of STANDARD_SPECIALIZATIONS) {
      expect(resolveWeaponTier(t3ItemId)).toBe(3);
      expect(resolveWeaponCraftRule(t3ItemId)?.kind).toBe("standard");
      expect(resolvePreviousWeaponTierItemId(t3ItemId)).toBeUndefined();

      const recipe = STANDARD_WEAPON_CRAFT_RECIPES.find(
        (entry) => entry.outputItemId === t3ItemId,
      );
      expect(recipe).toBeDefined();
      expect(recipe?.requirements.every((entry) =>
        entry.itemId.startsWith("item_refined_"),
      )).toBe(true);
    }
  });

  it("requires exactly the same-specialization T3 predecessor for every standard T4", () => {
    for (const [t3ItemId, t4ItemId] of STANDARD_SPECIALIZATIONS) {
      expect(resolveWeaponTier(t4ItemId)).toBe(4);
      expect(resolvePreviousWeaponTierItemId(t4ItemId)).toBe(t3ItemId);

      const recipe = STANDARD_WEAPON_CRAFT_RECIPES.find(
        (entry) => entry.outputItemId === t4ItemId,
      );
      expect(recipe).toBeDefined();

      const equipmentRequirements = recipe?.requirements.filter((entry) =>
        entry.itemId.startsWith("item_weapon_"),
      ) ?? [];
      expect(equipmentRequirements).toEqual([
        { itemId: t3ItemId, quantity: 1 },
      ]);
    }
  });

  it("requires exactly the same-specialization T4 predecessor for every standard T5", () => {
    for (const [, t4ItemId, t5ItemId] of STANDARD_SPECIALIZATIONS) {
      expect(resolveWeaponTier(t5ItemId)).toBe(5);
      expect(resolvePreviousWeaponTierItemId(t5ItemId)).toBe(t4ItemId);

      const recipe = STANDARD_WEAPON_CRAFT_RECIPES.find(
        (entry) => entry.outputItemId === t5ItemId,
      );
      expect(recipe).toBeDefined();

      const equipmentRequirements = recipe?.requirements.filter((entry) =>
        entry.itemId.startsWith("item_weapon_"),
      ) ?? [];
      expect(equipmentRequirements).toEqual([
        { itemId: t4ItemId, quantity: 1 },
      ]);
      expect(recipe?.requirements.some((entry) => entry.itemId.endsWith("_t5"))).toBe(true);
    }
  });

  it("keeps Badon outside the standard predecessor generator", () => {
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
