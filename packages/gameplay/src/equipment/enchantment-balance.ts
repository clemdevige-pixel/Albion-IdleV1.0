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
 * These initial values preserve the pre-decoupling live combat power exactly:
 * .1/.2/.3/.4 previously mapped to +50/+100/+150/+200 IP at +20% stats per
 * +100 IP, i.e. x1.10/x1.20/x1.30/x1.40. Balance sweeps may now evolve this
 * table without changing displayed Item Power or mastery scaling.
 */
export const ENCHANTMENT_STAT_MULTIPLIER: Readonly<Record<EnchantmentLevel, number>> = {
  0: 1,
  1: 1.1,
  2: 1.2,
  3: 1.3,
  4: 1.4,
};

export function getEnchantmentStatMultiplier(level: EnchantmentLevel): number {
  return ENCHANTMENT_STAT_MULTIPLIER[level];
}
