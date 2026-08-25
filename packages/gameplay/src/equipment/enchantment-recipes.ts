import {
  ENCHANTMENT_CATEGORY_COST_MULTIPLIERS,
  ENCHANTMENT_CATEGORY_RESOURCE_MULTIPLIERS,
  ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS,
  ENCHANTMENT_MAXIMUM_ITEM_TIER,
  ENCHANTMENT_MINIMUM_ITEM_TIER,
  ENCHANTMENT_RECIPE_STEPS,
  ENCHANTMENT_RESOURCE_TIERS,
  ENCHANTMENT_SHARD_COSTS,
  ENCHANTMENT_TIER_COST_MULTIPLIERS,
  type AuthoredEnchantmentCostCategory,
  type AuthoredEnchantmentTransitionLevel,
} from "@game/data";
import type { EnchantmentLevel } from "../inventory/types.js";

export type ActiveEnchantmentLevel = AuthoredEnchantmentTransitionLevel;
export type EnchantmentCostCategory = AuthoredEnchantmentCostCategory;

export {
  ENCHANTMENT_CATEGORY_COST_MULTIPLIERS,
  ENCHANTMENT_CATEGORY_RESOURCE_MULTIPLIERS,
  ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS,
  ENCHANTMENT_MAXIMUM_ITEM_TIER,
  ENCHANTMENT_MINIMUM_ITEM_TIER,
  ENCHANTMENT_RESOURCE_TIERS,
  ENCHANTMENT_SHARD_COSTS,
  ENCHANTMENT_TIER_COST_MULTIPLIERS,
};

export interface EnchantmentMaterialCost {
  readonly itemId: string;
  readonly quantity: number;
}

export function getEnchantmentShardItemId(itemTier: number): string {
  const normalizedTier = Math.max(
    ENCHANTMENT_MINIMUM_ITEM_TIER,
    Math.min(ENCHANTMENT_MAXIMUM_ITEM_TIER, Math.floor(itemTier)),
  );
  return `item_resource_enchantment_shard_t${String(normalizedTier)}`;
}

export interface EnchantmentRecipe {
  readonly fromLevel: EnchantmentLevel;
  readonly toLevel: EnchantmentLevel;
  readonly enabled: boolean;
  readonly silverCost: number;
  readonly materials: readonly EnchantmentMaterialCost[];
}

/** Typed gameplay view over the authored base Silver transitions. */
export const ENCHANTMENT_RECIPES: Readonly<Record<ActiveEnchantmentLevel, EnchantmentRecipe>> = {
  1: { ...ENCHANTMENT_RECIPE_STEPS[1], materials: [] },
  2: { ...ENCHANTMENT_RECIPE_STEPS[2], materials: [] },
  3: { ...ENCHANTMENT_RECIPE_STEPS[3], materials: [] },
  4: { ...ENCHANTMENT_RECIPE_STEPS[4], materials: [] },
};

export function getNextEnchantmentRecipe(
  currentLevel: EnchantmentLevel,
): EnchantmentRecipe | undefined {
  if (currentLevel >= 4) return undefined;
  return ENCHANTMENT_RECIPES[(currentLevel + 1) as ActiveEnchantmentLevel];
}

function scaleResourceQuantity(quantity: number, multiplier: number): number {
  return Math.max(1, Math.round(quantity * multiplier));
}

function getCategorySilverMultiplier(
  category: EnchantmentCostCategory,
  activeLevel: ActiveEnchantmentLevel | undefined,
): number {
  if (activeLevel === 4 && category === "one_handed_weapon") {
    return ENCHANTMENT_CATEGORY_COST_MULTIPLIERS.two_handed_weapon;
  }
  return ENCHANTMENT_CATEGORY_COST_MULTIPLIERS[category];
}

function getCategoryResourceMultiplier(
  category: EnchantmentCostCategory,
  activeLevel: ActiveEnchantmentLevel | undefined,
): number {
  if (activeLevel === 4 && category === "one_handed_weapon") return 1;
  return ENCHANTMENT_CATEGORY_RESOURCE_MULTIPLIERS[category];
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
  const activeLevel =
    recipe.toLevel >= 1 && recipe.toLevel <= 4
      ? recipe.toLevel as ActiveEnchantmentLevel
      : undefined;
  const silverMultiplier =
    tierMultiplier * getCategorySilverMultiplier(category, activeLevel);
  const resourceMultiplier = getCategoryResourceMultiplier(category, activeLevel);

  return {
    ...recipe,
    silverCost: recipe.enabled
      ? Math.max(1, Math.round(recipe.silverCost * silverMultiplier))
      : recipe.silverCost,
    materials: [
      ...(activeLevel === undefined
        ? []
        : [{
            itemId: getEnchantmentShardItemId(itemTier),
            quantity: scaleResourceQuantity(
              ENCHANTMENT_SHARD_COSTS[activeLevel],
              resourceMultiplier,
            ),
          }]),
      ...(activeLevel === undefined
        ? []
        : craftMaterials.map((material) => ({
            ...material,
            quantity: scaleResourceQuantity(
              material.quantity * ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS[activeLevel],
              resourceMultiplier,
            ),
          }))),
    ],
  };
}
