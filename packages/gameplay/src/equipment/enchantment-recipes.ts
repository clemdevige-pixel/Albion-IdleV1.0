import type { EnchantmentLevel } from "../inventory/types.js";

export type ActiveEnchantmentLevel = 1 | 2 | 3;

export interface EnchantmentMaterialCost {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * Temporary test setting. Set this value to 4 when T3 enchantment leaves the
 * test phase; every caller uses this single rule.
 */
export const ENCHANTMENT_MINIMUM_ITEM_TIER = 3;

export const ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS:
Readonly<Record<ActiveEnchantmentLevel, number>> = {
  1: 1,
  2: 2,
  3: 4,
};

export interface EnchantmentRecipe {
  readonly fromLevel: EnchantmentLevel;
  readonly toLevel: EnchantmentLevel;
  readonly enabled: boolean;
  readonly silverCost: number;
  readonly materials: readonly EnchantmentMaterialCost[];
}

export type EnchantmentCostCategory =
  | "one_handed_weapon"
  | "two_handed_weapon"
  | "off_hand"
  | "armor"
  | "cape";

export const ENCHANTMENT_TIER_COST_MULTIPLIERS: Readonly<Record<number, number>> = {
  3: 1,
  4: 1.5,
  5: 2,
  6: 2.75,
  7: 3.75,
  8: 5,
};

export const ENCHANTMENT_CATEGORY_COST_MULTIPLIERS:
Readonly<Record<EnchantmentCostCategory, number>> = {
  one_handed_weapon: 1,
  two_handed_weapon: 1.5,
  off_hand: 0.75,
  armor: 0.8,
  cape: 0.7,
};

/**
 * V1 balancing table. Values are deliberately centralized so economy tuning
 * never requires changes to transaction or UI code.
 *
 * Level .4 remains structurally reserved but disabled until its dedicated
 * mechanics are designed.
 */
export const ENCHANTMENT_RECIPES: Readonly<Record<1 | 2 | 3 | 4, EnchantmentRecipe>> = {
  1: {
    fromLevel: 0,
    toLevel: 1,
    enabled: true,
    silverCost: 250,
    materials: [{ itemId: "item_resource_enchantment_essence", quantity: 2 }],
  },
  2: {
    fromLevel: 1,
    toLevel: 2,
    enabled: true,
    silverCost: 1_000,
    materials: [
      { itemId: "item_resource_enchantment_essence", quantity: 5 },
      { itemId: "item_resource_arcane_crystal", quantity: 2 },
    ],
  },
  3: {
    fromLevel: 2,
    toLevel: 3,
    enabled: true,
    silverCost: 5_000,
    materials: [
      { itemId: "item_resource_enchantment_essence", quantity: 10 },
      { itemId: "item_resource_arcane_crystal", quantity: 5 },
      { itemId: "item_resource_enchantment_catalyst", quantity: 1 },
    ],
  },
  4: {
    fromLevel: 3,
    toLevel: 4,
    enabled: false,
    silverCost: 0,
    materials: [],
  },
};

export function getNextEnchantmentRecipe(
  currentLevel: EnchantmentLevel,
): EnchantmentRecipe | undefined {
  if (currentLevel >= 4) return undefined;
  return ENCHANTMENT_RECIPES[(currentLevel + 1) as 1 | 2 | 3 | 4];
}

export function scaleEnchantmentRecipe(
  recipe: EnchantmentRecipe,
  itemTier: number,
  category: EnchantmentCostCategory,
  craftMaterials: readonly EnchantmentMaterialCost[] = [],
): EnchantmentRecipe {
  const tierMultiplier =
    ENCHANTMENT_TIER_COST_MULTIPLIERS[itemTier]
    ?? Math.max(1, 1 + (itemTier - 3) * 0.75);
  const multiplier =
    tierMultiplier * ENCHANTMENT_CATEGORY_COST_MULTIPLIERS[category];
  return {
    ...recipe,
    silverCost: Math.max(1, Math.round(recipe.silverCost * multiplier)),
    materials: [
      ...recipe.materials.map((material) => ({
        ...material,
        quantity: Math.max(1, Math.ceil(material.quantity * multiplier)),
      })),
      ...(
        recipe.toLevel >= 1 && recipe.toLevel <= 3
          ? craftMaterials.map((material) => ({
              ...material,
              quantity:
                material.quantity
                * ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS[
                  recipe.toLevel as ActiveEnchantmentLevel
                ],
            }))
          : []
      ),
    ],
  };
}
