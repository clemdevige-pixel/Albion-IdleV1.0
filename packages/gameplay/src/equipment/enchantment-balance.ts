import type { EnchantmentLevel } from "../inventory/types.js";

/**
 * Single balancing source for enchantment Item Power.
 * Saves store only the level, so these values can change without migration.
 */
export const ENCHANTMENT_ITEM_POWER: Readonly<Record<EnchantmentLevel, number>> = {
  0: 0,
  1: 100,
  2: 200,
  3: 300,
  4: 400,
};

/** Shared conversion rule for every bonus Item Power source. */
export const ITEM_POWER_STAT_GAIN_PER_100 = 0.2;

export function getBonusItemPowerStatMultiplier(bonusItemPower: number): number {
  const safeBonus = Math.max(0, bonusItemPower);
  return 1 + (safeBonus / 100) * ITEM_POWER_STAT_GAIN_PER_100;
}

export function getEnchantmentItemPowerBonus(level: EnchantmentLevel): number {
  return ENCHANTMENT_ITEM_POWER[level];
}

/**
 * The current IP curve grants +20% equipment stats per +100 bonus IP.
 * Weapon attack speed is an identity property and is excluded by stat sync.
 */
export function getEnchantmentStatMultiplier(level: EnchantmentLevel): number {
  return getBonusItemPowerStatMultiplier(getEnchantmentItemPowerBonus(level));
}
