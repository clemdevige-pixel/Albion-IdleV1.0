import type { EnchantmentLevel } from "../inventory/types.js";

export type ActiveEnchantmentLevel = 1 | 2 | 3 | 4;

export interface EnchantmentMaterialCost {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * V1 rule: equipment can only be enchanted from T4 onward.
 * Every caller uses this single authoritative threshold.
 */
export const ENCHANTMENT_MINIMUM_ITEM_TIER = 4;
export const ENCHANTMENT_MAXIMUM_ITEM_TIER = 8;

/** One combat-earned enchantment resource exists per equipment tier. */
export const ENCHANTMENT_RESOURCE_TIERS = [4, 5, 6, 7, 8] as const;

/**
 * Incremental shard costs for each enchantment step.
 * .1-.3 use the validated 10/30/60 progression; .4 remains the 100-shard
 * Awakened transition. The 50/50 resource split keeps 1H + off-hand equal to
 * one 2H package through .3.
 */
export const ENCHANTMENT_SHARD_COSTS: Readonly<Record<ActiveEnchantmentLevel, number>> = {
  1: 10,
  2: 30,
  3: 60,
  4: 100,
};

export function getEnchantmentShardItemId(itemTier: number): string {
  const normalizedTier = Math.max(
    ENCHANTMENT_MINIMUM_ITEM_TIER,
    Math.min(ENCHANTMENT_MAXIMUM_ITEM_TIER, Math.floor(itemTier)),
  );
  return `item_resource_enchantment_shard_t${String(normalizedTier)}`;
}

export const ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS:
Readonly<Record<ActiveEnchantmentLevel, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
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

/**
 * Silver pricing for .1-.3. A 1H + off-hand package must cost exactly the same
 * as a 2H package, so each half uses 0.75 while a 2H weapon uses 1.5.
 * .4 is weapon Awakening and is resolved as a full weapon cost below.
 */
export const ENCHANTMENT_CATEGORY_COST_MULTIPLIERS:
Readonly<Record<EnchantmentCostCategory, number>> = {
  one_handed_weapon: 0.75,
  two_handed_weapon: 1.5,
  off_hand: 0.75,
  armor: 0.8,
  cape: 0.7,
};

/**
 * Combat-time/resource share for the .1-.3 weapon package.
 * 1H + off-hand = 50% + 50% = one 2H package.
 * Armor/cape keep their full per-item resource cost.
 * .4 is weapon Awakening and is resolved as a full weapon cost below.
 */
export const ENCHANTMENT_CATEGORY_RESOURCE_MULTIPLIERS:
Readonly<Record<EnchantmentCostCategory, number>> = {
  one_handed_weapon: 0.5,
  two_handed_weapon: 1,
  off_hand: 0.5,
  armor: 1,
  cape: 1,
};

/**
 * Base recipes contain the deterministic Silver step. The tier-matching shard
 * and refined craft materials are injected by scaleEnchantmentRecipe.
 *
 * .4 is not a normal package enchantment: it is the weapon Awakening step.
 * Eligible 1H and 2H weapons therefore pay the same full weapon resource and
 * Silver cost. Off-hands remain capped at .3 by authored item policy.
 */
export const ENCHANTMENT_RECIPES: Readonly<Record<1 | 2 | 3 | 4, EnchantmentRecipe>> = {
  1: {
    fromLevel: 0,
    toLevel: 1,
    enabled: true,
    silverCost: 250,
    materials: [],
  },
  2: {
    fromLevel: 1,
    toLevel: 2,
    enabled: true,
    silverCost: 1_000,
    materials: [],
  },
  3: {
    fromLevel: 2,
    toLevel: 3,
    enabled: true,
    silverCost: 5_000,
    materials: [],
  },
  4: {
    fromLevel: 3,
    toLevel: 4,
    enabled: true,
    silverCost: 25_000,
    materials: [],
  },
};

export function getNextEnchantmentRecipe(
  currentLevel: EnchantmentLevel,
): EnchantmentRecipe | undefined {
  if (currentLevel >= 4) return undefined;
  return ENCHANTMENT_RECIPES[(currentLevel + 1) as 1 | 2 | 3 | 4];
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
