import { describe, expect, it } from "vitest";
import {
  ENCHANTMENT_ITEM_POWER,
  getBonusItemPowerStatMultiplier,
  getEnchantmentItemPowerBonus,
  getEnchantmentStatMultiplier,
} from "../enchantment-balance.js";
import {
  ENCHANTMENT_MINIMUM_ITEM_TIER,
  getEnchantmentShardItemId,
  getNextEnchantmentRecipe,
  scaleEnchantmentRecipe,
} from "../enchantment-recipes.js";

describe("enchantment balance", () => {
  it("uses the validated display IP curve", () => {
    expect(ENCHANTMENT_ITEM_POWER).toEqual({
      0: 0,
      1: 25,
      2: 50,
      3: 75,
      4: 100,
    });
    expect(getEnchantmentItemPowerBonus(3)).toBe(75);
  });

  it("uses the validated independent combat-stat curve", () => {
    expect(getEnchantmentStatMultiplier(0)).toBe(1);
    expect(getEnchantmentStatMultiplier(1)).toBe(1.12);
    expect(getEnchantmentStatMultiplier(2)).toBe(1.26);
    expect(getEnchantmentStatMultiplier(3)).toBe(1.42);
    expect(getEnchantmentStatMultiplier(4)).toBe(1.42);
    expect(getBonusItemPowerStatMultiplier(50)).toBe(1.1);
  });

  it("starts V1 equipment enchantment at T4", () => {
    expect(ENCHANTMENT_MINIMUM_ITEM_TIER).toBe(4);
  });

  it("resolves tier shard ids and applies authored category costs to scaled recipes", () => {
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
      quantity: 50,
    });
    expect(scaled.materials).toContainEqual({
      itemId: "item_refined_planks_t5",
      quantity: 6,
    });
    expect(scaled.materials.some((material) => material.itemId.includes("essence"))).toBe(false);
  });

  it("keeps a 1H plus off-hand shard package equal to one 2H package through .3", () => {
    const expectedByLevel = {
      1: { oneHanded: 15, offHand: 5, twoHanded: 20 },
      2: { oneHanded: 30, offHand: 20, twoHanded: 50 },
      3: { oneHanded: 70, offHand: 35, twoHanded: 105 },
    } as const;

    const shardId = "item_resource_enchantment_shard_t4";
    for (const currentLevel of [0, 1, 2] as const) {
      const recipe = getNextEnchantmentRecipe(currentLevel);
      expect(recipe).toBeDefined();
      if (recipe === undefined) continue;
      const level = recipe.toLevel as 1 | 2 | 3;
      const material = [{ itemId: "item_refined_metal_bar_t4", quantity: 6 }];
      const twoHanded = scaleEnchantmentRecipe(recipe, 4, "two_handed_weapon", material);
      const oneHanded = scaleEnchantmentRecipe(recipe, 4, "one_handed_weapon", material);
      const offHand = scaleEnchantmentRecipe(recipe, 4, "off_hand", material);
      const shardQty = (scaled: typeof twoHanded) =>
        scaled.materials.find(({ itemId }) => itemId === shardId)?.quantity ?? 0;
      const expected = expectedByLevel[level];

      expect(shardQty(oneHanded)).toBe(expected.oneHanded);
      expect(shardQty(offHand)).toBe(expected.offHand);
      expect(shardQty(twoHanded)).toBe(expected.twoHanded);
      expect(shardQty(oneHanded) + shardQty(offHand)).toBe(shardQty(twoHanded));
    }
  });

  it("keeps the validated 500-shard full-loadout budget through .3", () => {
    const total = (category: Parameters<typeof scaleEnchantmentRecipe>[2]): number => {
      let shards = 0;
      for (const currentLevel of [0, 1, 2] as const) {
        const recipe = getNextEnchantmentRecipe(currentLevel);
        if (recipe === undefined) continue;
        const scaled = scaleEnchantmentRecipe(recipe, 4, category);
        shards += scaled.materials[0]?.quantity ?? 0;
      }
      return shards;
    };

    expect(total("two_handed_weapon")).toBe(175);
    expect(total("one_handed_weapon")).toBe(115);
    expect(total("armor_torso")).toBe(115);
    expect(total("armor_head")).toBe(75);
    expect(total("armor_boots")).toBe(75);
    expect(total("off_hand")).toBe(60);
    expect(total("cape")).toBe(60);

    expect(total("two_handed_weapon") + total("armor_torso") + total("armor_head") + total("armor_boots") + total("cape")).toBe(500);
    expect(total("one_handed_weapon") + total("off_hand") + total("armor_torso") + total("armor_head") + total("armor_boots") + total("cape")).toBe(500);
  });

  it("charges the same 225-shard .4 Awakening cost to 1H and 2H weapons", () => {
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
      { itemId: "item_resource_enchantment_shard_t4", quantity: 225 },
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
      quantity: 225,
    });
    expect(t8TwoHanded.materials).toContainEqual({
      itemId: "item_refined_planks_t8",
      quantity: 48,
    });
  });
});
