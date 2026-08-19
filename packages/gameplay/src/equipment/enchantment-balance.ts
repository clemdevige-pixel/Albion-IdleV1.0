import type { EnchantmentLevel } from "../inventory/types.js";

/**
 * Display / progression Item Power carried by enchantment.
 *
 * Enchantment IP is intentionally capped at +100 for .4 so a fully enchanted
 * item never exceeds the base IP of the next equipment tier. Combat power is
 * resolved independently through ENCHANTMENT_STAT_MULTIPLIER below.
 */
export const ENCHANTMENT_ITEM_POWER: Readonly<Record<EnchantmentLevel, number>> = {
  0: 0,
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

/** Shared conversion rule for bonus Item Power sources such as masteries. */
export const ITEM_POWER_STAT_GAIN_PER_100 = 0.2;

export function getBonusItemPowerStatMultiplier(bonusItemPower: number): number {
  const safeBonus = Math.max(0, bonusItemPower);
  return 1 + (safeBonus / 100) * ITEM_POWER_STAT_GAIN_PER_100;
}

export function getEnchantmentItemPowerBonus(level: EnchantmentLevel): number {
  return ENCHANTMENT_ITEM_POWER[level];
}

/**
 * Independent combat-stat scaling for enchantment.
 *
 * Validated V1 normal-enchantment curve:
 * .1 = x1.12, .2 = x1.26, .3 = x1.42.
 *
 * .4 is a distinct weapon-only Awakening state. Until its dedicated combat
 * curve is revalidated, it preserves the .3 base-stat multiplier so Awakening
 * can never reduce equipment stats; Awakening-specific traits provide the
 * separate progression layer.
 */
export const ENCHANTMENT_STAT_MULTIPLIER: Readonly<Record<EnchantmentLevel, number>> = {
  0: 1,
  1: 1.12,
  2: 1.26,
  3: 1.42,
  4: 1.42,
};

export function getEnchantmentStatMultiplier(level: EnchantmentLevel): number {
  return ENCHANTMENT_STAT_MULTIPLIER[level];
}
