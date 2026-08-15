import type { EnchantmentLevel } from "../inventory/types.js";

export type ActiveEnchantmentLevel = 1 | 2 | 3;

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
 * Validated shard baseline. Values are incremental costs for each step, so a
 * .0 -> .3 item consumes 110 shards total (10 + 30 + 70).
 */
export const ENCHANTMENT_SHARD_COSTS: Readonly<Record<ActiveEnchantmentLevel, number>> = {
  1: 10,
  2: 30,
  3: 70,
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
 * Base recipes now contain only the deterministic Silver step. The shard for
 * the item's own tier is injected by scaleEnchantmentRecipe, which prevents a
 * T4 resource from ever paying for a T5+ enchantment. Refined craft materials
 * remain secondary sinks and are also injected there.
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
  const activeLevel =
    recipe.toLevel >= 1 && recipe.toLevel <= 3
      ? recipe.toLevel as ActiveEnchantmentLevel
      : undefined;

  return {
    ...recipe,
    silverCost: recipe.enabled
      ? Math.max(1, Math.round(recipe.silverCost * multiplier))
      : recipe.silverCost,
    materials: [
      ...(activeLevel === undefined
        ? []
        : [{
            itemId: getEnchantmentShardItemId(itemTier),
            // Shards encode combat time. Their 10/30/70 baseline deliberately
            // does not scale by weapon category or tier; those differences are
            // already represented by Silver and refined-material sinks.
            quantity: ENCHANTMENT_SHARD_COSTS[activeLevel],
          }]),
      ...(activeLevel === undefined
        ? []
        : craftMaterials.map((material) => ({
            ...material,
            quantity:
              material.quantity
              * ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS[activeLevel],
          }))),
    ],
  };
}
