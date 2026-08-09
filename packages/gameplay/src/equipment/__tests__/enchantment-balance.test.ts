import { describe, expect, it } from "vitest";
import {
  ENCHANTMENT_ITEM_POWER,
  getBonusItemPowerStatMultiplier,
  getEnchantmentItemPowerBonus,
  getEnchantmentStatMultiplier,
} from "../enchantment-balance.js";
import { ENCHANTMENT_MINIMUM_ITEM_TIER } from "../enchantment-recipes.js";

describe("enchantment balance", () => {
  it("uses the adjustable 100 IP per level curve", () => {
    expect(ENCHANTMENT_ITEM_POWER).toEqual({
      0: 0,
      1: 100,
      2: 200,
      3: 300,
      4: 400,
    });
    expect(getEnchantmentItemPowerBonus(3)).toBe(300);
  });

  it("converts bonus IP into deterministic equipment stat scaling", () => {
    expect(getEnchantmentStatMultiplier(0)).toBe(1);
    expect(getEnchantmentStatMultiplier(1)).toBe(1.2);
    expect(getEnchantmentStatMultiplier(4)).toBe(1.8);
    expect(getBonusItemPowerStatMultiplier(50)).toBe(1.1);
  });

  it("starts V1 equipment enchantment at T4", () => {
    expect(ENCHANTMENT_MINIMUM_ITEM_TIER).toBe(4);
  });
});
