export type AuthoredEnchantmentTransitionLevel = 1 | 2 | 3 | 4;

export type AuthoredEnchantmentCostCategory =
  | "one_handed_weapon"
  | "two_handed_weapon"
  | "off_hand"
  | "armor_head"
  | "armor_torso"
  | "armor_boots"
  | "cape";

export const ENCHANTMENT_MINIMUM_ITEM_TIER = 4;
export const ENCHANTMENT_MAXIMUM_ITEM_TIER = 8;
export const ENCHANTMENT_RESOURCE_TIERS = [4, 5, 6, 7, 8] as const;

/**
 * Absolute matching-tier shard cost per equipment category and transition.
 * .1-.3 preserve a 500-shard full-loadout budget for both 2H and 1H+off-hand builds.
 * .4 keeps the previous live costs pending its dedicated recalibration.
 */
export const ENCHANTMENT_SHARD_COSTS: Readonly<
  Record<AuthoredEnchantmentCostCategory, Readonly<Record<AuthoredEnchantmentTransitionLevel, number>>>
> = {
  two_handed_weapon: { 1: 20, 2: 50, 3: 105, 4: 100 },
  one_handed_weapon: { 1: 15, 2: 30, 3: 70, 4: 100 },
  armor_torso: { 1: 15, 2: 35, 3: 65, 4: 100 },
  armor_head: { 1: 10, 2: 20, 3: 45, 4: 100 },
  armor_boots: { 1: 10, 2: 20, 3: 45, 4: 100 },
  off_hand: { 1: 5, 2: 20, 3: 35, 4: 50 },
  cape: { 1: 5, 2: 20, 3: 35, 4: 100 },
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
  armor_head: 0.8,
  armor_torso: 0.8,
  armor_boots: 0.8,
  cape: 0.7,
};

export const ENCHANTMENT_CATEGORY_RESOURCE_MULTIPLIERS: Readonly<Record<AuthoredEnchantmentCostCategory, number>> = {
  one_handed_weapon: 0.5,
  two_handed_weapon: 1,
  off_hand: 0.5,
  armor_head: 1,
  armor_torso: 1,
  armor_boots: 1,
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
