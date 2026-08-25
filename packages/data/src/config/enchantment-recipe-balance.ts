export type AuthoredEnchantmentTransitionLevel = 1 | 2 | 3 | 4;

export type AuthoredEnchantmentCostCategory =
  | "one_handed_weapon"
  | "two_handed_weapon"
  | "off_hand"
  | "armor"
  | "cape";

export const ENCHANTMENT_MINIMUM_ITEM_TIER = 4;
export const ENCHANTMENT_MAXIMUM_ITEM_TIER = 8;
export const ENCHANTMENT_RESOURCE_TIERS = [4, 5, 6, 7, 8] as const;

/** Incremental matching-tier shard cost for each enchantment transition. */
export const ENCHANTMENT_SHARD_COSTS: Readonly<Record<AuthoredEnchantmentTransitionLevel, number>> = {
  1: 10,
  2: 30,
  3: 60,
  4: 100,
};

/** Refined base-craft material multiplier applied at each transition. */
export const ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS: Readonly<Record<AuthoredEnchantmentTransitionLevel, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
};

export const ENCHANTMENT_TIER_COST_MULTIPLIERS: Readonly<Record<number, number>> = {
  3: 1,
  4: 1.5,
  5: 2,
  6: 2.75,
  7: 3.75,
  8: 5,
};

export const ENCHANTMENT_CATEGORY_COST_MULTIPLIERS: Readonly<Record<AuthoredEnchantmentCostCategory, number>> = {
  one_handed_weapon: 0.75,
  two_handed_weapon: 1.5,
  off_hand: 0.75,
  armor: 0.8,
  cape: 0.7,
};

export const ENCHANTMENT_CATEGORY_RESOURCE_MULTIPLIERS: Readonly<Record<AuthoredEnchantmentCostCategory, number>> = {
  one_handed_weapon: 0.5,
  two_handed_weapon: 1,
  off_hand: 0.5,
  armor: 1,
  cape: 1,
};

export interface AuthoredEnchantmentRecipeStep {
  readonly fromLevel: 0 | 1 | 2 | 3;
  readonly toLevel: AuthoredEnchantmentTransitionLevel;
  readonly enabled: boolean;
  readonly silverCost: number;
}

/** Base Silver steps before tier/category scaling. */
export const ENCHANTMENT_RECIPE_STEPS: Readonly<Record<AuthoredEnchantmentTransitionLevel, AuthoredEnchantmentRecipeStep>> = {
  1: { fromLevel: 0, toLevel: 1, enabled: true, silverCost: 250 },
  2: { fromLevel: 1, toLevel: 2, enabled: true, silverCost: 1_000 },
  3: { fromLevel: 2, toLevel: 3, enabled: true, silverCost: 5_000 },
  4: { fromLevel: 3, toLevel: 4, enabled: true, silverCost: 25_000 },
};
