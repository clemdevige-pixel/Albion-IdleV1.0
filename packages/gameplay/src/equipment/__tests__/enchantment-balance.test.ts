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

  it("uses one shard resource per tier with 10/30/60/100 costs", () => {
    expect(ENCHANTMENT_SHARD_COSTS).toEqual({ 1: 10, 2: 30, 3: 60, 4: 100 });
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

  it("makes a 1H plus off-hand package equal one 2H package through .3", () => {
    const recipe = getNextEnchantmentRecipe(2);
    expect(recipe).toBeDefined();
    if (recipe === undefined) return;

    const material = [{ itemId: "item_refined_metal_bar_t4", quantity: 6 }];
    const twoHanded = scaleEnchantmentRecipe(recipe, 4, "two_handed_weapon", material);
    const oneHanded = scaleEnchantmentRecipe(recipe, 4, "one_handed_weapon", material);
    const offHand = scaleEnchantmentRecipe(recipe, 4, "off_hand", material);

    expect(oneHanded.silverCost + offHand.silverCost).toBe(twoHanded.silverCost);

    const shardId = "item_resource_enchantment_shard_t4";
    const shardQty = (scaled: typeof twoHanded) =>
      scaled.materials.find(({ itemId }) => itemId === shardId)?.quantity ?? 0;
    expect(shardQty(oneHanded)).toBe(30);
    expect(shardQty(offHand)).toBe(30);
    expect(shardQty(twoHanded)).toBe(60);
    expect(shardQty(oneHanded) + shardQty(offHand)).toBe(shardQty(twoHanded));

    const materialQty = (scaled: typeof twoHanded) =>
      scaled.materials.find(({ itemId }) => itemId === "item_refined_metal_bar_t4")?.quantity ?? 0;
    expect(materialQty(oneHanded) + materialQty(offHand)).toBe(materialQty(twoHanded));
  });

  it("charges the same full .4 Awakening cost to 1H and 2H weapons", () => {
    const recipe = getNextEnchantmentRecipe(3);
    expect(recipe).toMatchObject({ fromLevel: 3, toLevel: 4, enabled: true });
    if (recipe === undefined) return;

    const oneHanded = scaleEnchantmentRecipe(
      recipe,
      4,
      "one_handed_weapon",
      [
        { itemId: "item_refined_metal_bar_t4", quantity: 6 },
        { itemId: "item_refined_leather_t4", quantity: 2 },
      ],
    );
    const twoHanded = scaleEnchantmentRecipe(
      recipe,
      4,
      "two_handed_weapon",
      [
        { itemId: "item_refined_metal_bar_t4", quantity: 6 },
        { itemId: "item_refined_leather_t4", quantity: 2 },
      ],
    );

    expect(oneHanded.silverCost).toBe(56_250);
    expect(oneHanded.silverCost).toBe(twoHanded.silverCost);
    expect(oneHanded.materials).toEqual([
      { itemId: "item_resource_enchantment_shard_t4", quantity: 100 },
      { itemId: "item_refined_metal_bar_t4", quantity: 48 },
      { itemId: "item_refined_leather_t4", quantity: 16 },
    ]);
    expect(oneHanded.materials).toEqual(twoHanded.materials);

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
