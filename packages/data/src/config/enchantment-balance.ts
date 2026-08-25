export type AuthoredEnchantmentLevel = 0 | 1 | 2 | 3 | 4;

/** Display / progression Item Power carried by enchantment. */
export const ENCHANTMENT_ITEM_POWER: Readonly<Record<AuthoredEnchantmentLevel, number>> = {
  0: 0,
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

/** Shared conversion rule for bonus Item Power sources such as masteries. */
export const ITEM_POWER_STAT_GAIN_PER_100 = 0.2;

/** Independent combat-stat scaling for enchantment. */
export const ENCHANTMENT_STAT_MULTIPLIER: Readonly<Record<AuthoredEnchantmentLevel, number>> = {
  0: 1,
  1: 1.12,
  2: 1.26,
  3: 1.42,
  4: 1.42,
};
