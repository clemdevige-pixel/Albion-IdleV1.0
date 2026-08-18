import { describe, expect, it } from "vitest";
import {
  ENCHANTMENT_ITEM_POWER,
  getBonusItemPowerStatMultiplier,
  getEnchantmentItemPowerBonus,
  getEnchantmentStatMultiplier,
} from "../enchantment-balance.js";
import {
  ENCHANTMENT_MINIMUM_ITEM_TIER,
  ENCHANTMENT_SHARD_COSTS,
  getEnchantmentShardItemId,
  getNextEnchantmentRecipe,
  scaleEnchantmentRecipe,
} from "../enchantment-recipes.js";

describe("enchantment balance", () => {
  it("uses the validated 50 IP per level curve", () => {
    expect(ENCHANTMENT_ITEM_POWER).toEqual({
      0: 0,
      1: 50,
      2: 100,
      3: 150,
      4: 200,
    });
    expect(getEnchantmentItemPowerBonus(3)).toBe(150);
  });

  it("converts bonus IP into deterministic equipment stat scaling", () => {
    expect(getEnchantmentStatMultiplier(0)).toBe(1);
    expect(getEnchantmentStatMultiplier(1)).toBe(1.1);
    expect(getEnchantmentStatMultiplier(3)).toBe(1.3);
    expect(getEnchantmentStatMultiplier(4)).toBe(1.4);
    expect(getBonusItemPowerStatMultiplier(50)).toBe(1.1);
  });

  it("starts V1 equipment enchantment at T4", () => {
    expect(ENCHANTMENT_MINIMUM_ITEM_TIER).toBe(4);
  });

  it("uses one shard resource per tier with 10/30/70/100 incremental costs", () => {
    expect(ENCHANTMENT_SHARD_COSTS).toEqual({ 1: 10, 2: 30, 3: 70, 4: 100 });
    expect(getEnchantmentShardItemId(4)).toBe("item_resource_enchantment_shard_t4");
    expect(getEnchantmentShardItemId(5)).toBe("item_resource_enchantment_shard_t5");

    const recipe = getNextEnchantmentRecipe(1);
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;

    const scaled = scaleEnchantmentRecipe(
      recipe,
      5,
      "two_handed_weapon",
      [{ itemId: "item_refined_planks_t5", quantity: 3 }],
    );
    expect(scaled.materials).toContainEqual({
      itemId: "item_resource_enchantment_shard_t5",
      quantity: 30,
    });
    expect(scaled.materials).toContainEqual({
      itemId: "item_refined_planks_t5",
      quantity: 6,
    });
    expect(scaled.materials.some((material) => material.itemId.includes("essence"))).toBe(false);
  });

  it("treats .3 -> .4 as the next enchantment step with 100 shards and craft materials", () => {
    const recipe = getNextEnchantmentRecipe(3);
    expect(recipe).toMatchObject({ fromLevel: 3, toLevel: 4, enabled: true });
    if (recipe === undefined) return;

    const t4OneHanded = scaleEnchantmentRecipe(
      recipe,
      4,
      "one_handed_weapon",
      [
        { itemId: "item_refined_metal_bar_t4", quantity: 6 },
        { itemId: "item_refined_leather_t4", quantity: 2 },
      ],
    );
    expect(t4OneHanded.silverCost).toBe(37_500);
    expect(t4OneHanded.materials).toEqual([
      { itemId: "item_resource_enchantment_shard_t4", quantity: 100 },
      { itemId: "item_refined_metal_bar_t4", quantity: 48 },
      { itemId: "item_refined_leather_t4", quantity: 16 },
    ]);

    const t8TwoHanded = scaleEnchantmentRecipe(
      recipe,
      8,
      "two_handed_weapon",
      [{ itemId: "item_refined_planks_t8", quantity: 6 }],
    );
    expect(t8TwoHanded.silverCost).toBe(187_500);
    expect(t8TwoHanded.materials).toContainEqual({
      itemId: "item_resource_enchantment_shard_t8",
      quantity: 100,
    });
    expect(t8TwoHanded.materials).toContainEqual({
      itemId: "item_refined_planks_t8",
      quantity: 48,
    });
  });
});
