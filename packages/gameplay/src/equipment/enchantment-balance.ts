import {
  ENCHANTMENT_ITEM_POWER,
  ENCHANTMENT_STAT_MULTIPLIER,
  ITEM_POWER_STAT_GAIN_PER_100,
} from "@game/data";
import type { EnchantmentLevel } from "../inventory/types.js";

export {
  ENCHANTMENT_ITEM_POWER,
  ENCHANTMENT_STAT_MULTIPLIER,
  ITEM_POWER_STAT_GAIN_PER_100,
};

export function getBonusItemPowerStatMultiplier(bonusItemPower: number): number {
  const safeBonus = Math.max(0, bonusItemPower);
  return 1 + (safeBonus / 100) * ITEM_POWER_STAT_GAIN_PER_100;
}

export function getEnchantmentItemPowerBonus(level: EnchantmentLevel): number {
  return ENCHANTMENT_ITEM_POWER[level];
}

export function getEnchantmentStatMultiplier(level: EnchantmentLevel): number {
  return ENCHANTMENT_STAT_MULTIPLIER[level];
}
