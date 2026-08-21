import { describe, expect, it } from "vitest";
import { getNextEnchantmentRecipe, scaleEnchantmentRecipe } from "@game/gameplay";
import {
  FACTION_CAPE_CRAFT_RECIPES,
  KEEPER_CAPE_CONTENT,
  resolveFactionCapeDungeonDamageReductionPercent,
} from "./factionCapeContentCatalog.js";
import {
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
} from "./itemContentCatalog.js";

describe("factionCapeContentCatalog", () => {
  it("authors the validated Keeper T4-T8 defensive curve with no HP", () => {
    expect(KEEPER_CAPE_CONTENT.map((cape) => [
      cape.tier,
      cape.stats.stat_armor,
      cape.stats.stat_magic_resistance,
      cape.stats.stat_max_health,
      cape.dungeonDamageReductionPercent,
    ])).toEqual([
      [4, 3, 5, undefined, 6],
      [5, 4, 7, undefined, 8],
      [6, 6, 10, undefined, 11],
      [7, 9, 14, undefined, 14],
      [8, 13, 20, undefined, 18],
    ]);
  });

  it("authors matching-tier Cloth, Leather and Keeper Rune base recipes", () => {
    expect(FACTION_CAPE_CRAFT_RECIPES.map((recipe) => [recipe.tier, recipe.requirements]))
      .toEqual([
        [4, [
          { itemId: "item_refined_cloth_t4", quantity: 3 },
          { itemId: "item_refined_leather_t4", quantity: 1 },
          { itemId: "item_resource_rune_keeper_t4", quantity: 3 },
        ]],
        [5, [
          { itemId: "item_refined_cloth_t5", quantity: 4 },
          { itemId: "item_refined_leather_t5", quantity: 2 },
          { itemId: "item_resource_rune_keeper_t5", quantity: 4 },
        ]],
        [6, [
          { itemId: "item_refined_cloth_t6", quantity: 5 },
          { itemId: "item_refined_leather_t6", quantity: 2 },
          { itemId: "item_resource_rune_keeper_t6", quantity: 5 },
        ]],
        [7, [
          { itemId: "item_refined_cloth_t7", quantity: 6 },
          { itemId: "item_refined_leather_t7", quantity: 3 },
          { itemId: "item_resource_rune_keeper_t7", quantity: 6 },
        ]],
        [8, [
          { itemId: "item_refined_cloth_t8", quantity: 8 },
          { itemId: "item_refined_leather_t8", quantity: 4 },
          { itemId: "item_resource_rune_keeper_t8", quantity: 8 },
        ]],
      ]);
  });

  it("registers Keeper capes as ordinary cape equipment", () => {
    expect(resolveEquipmentInfo("item_cape_t4_keeper")).toMatchObject({
      itemId: "item_cape_t4_keeper",
      slot: "cape",
      stats: { stat_armor: 3, stat_magic_resistance: 5 },
    });
  });

  it("reuses generic enchantment material scaling for Keeper Runes and caps capes at .3", () => {
    const info = resolveEnchantmentItemInfo("item_cape_t4_keeper");
    expect(info).toBeDefined();
    expect(info?.maximumLevel).toBe(3);
    expect(info?.craftMaterials).toContainEqual({
      itemId: "item_resource_rune_keeper_t4",
      quantity: 3,
    });

    const runeQuantities = ([0, 1, 2] as const).map((index) => {
      const recipe = getNextEnchantmentRecipe(index);
      if (recipe === undefined || info === undefined) return undefined;
      const scaled = scaleEnchantmentRecipe(
        recipe,
        info.itemTier,
        info.costCategory,
        info.craftMaterials,
      );
      return scaled.materials.find(
        (material) => material.itemId === "item_resource_rune_keeper_t4",
      )?.quantity;
    });

    expect(runeQuantities).toEqual([3, 6, 12]);
  });

  it("activates the passive only for matching faction dungeons at the cape tier or above", () => {
    expect(resolveFactionCapeDungeonDamageReductionPercent(
      "item_cape_t4_keeper",
      { factionId: "Keeper", tier: 4 },
    )).toBe(6);
    expect(resolveFactionCapeDungeonDamageReductionPercent(
      "item_cape_t4_keeper",
      { factionId: "Keeper", tier: 8 },
    )).toBe(6);
    expect(resolveFactionCapeDungeonDamageReductionPercent(
      "item_cape_t6_keeper",
      { factionId: "Keeper", tier: 5 },
    )).toBe(0);
    expect(resolveFactionCapeDungeonDamageReductionPercent(
      "item_cape_t6_keeper",
      { factionId: "Keeper", tier: 6 },
    )).toBe(11);
    expect(resolveFactionCapeDungeonDamageReductionPercent(
      "item_cape_t8_keeper",
      { factionId: "Heretic", tier: 8 },
    )).toBe(0);
  });
});
