import { getFactionRuneItemId } from "@game/data";
import { getNextEnchantmentRecipe, scaleEnchantmentRecipe } from "@game/gameplay";
import { describe, expect, it } from "vitest";
import {
  FACTION_CAPE_CONTENT,
  FACTION_CAPE_CRAFT_RECIPES,
  resolveFactionCapeDungeonDamageReductionPercent,
} from "./factionCapeContentCatalog.js";
import {
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
} from "./itemContentCatalog.js";

const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;
const EXPECTED_BALANCE = [
  [4, 3, 5, 3, 1, 3, 6],
  [5, 4, 7, 4, 2, 4, 8],
  [6, 6, 10, 5, 2, 5, 11],
  [7, 9, 14, 6, 3, 6, 14],
  [8, 13, 20, 8, 4, 8, 18],
] as const;

describe("factionCapeContentCatalog", () => {
  it("authors the same validated defensive and recipe curve for all factions", () => {
    expect(FACTION_CAPE_CONTENT).toHaveLength(20);
    for (const factionId of FACTIONS) {
      const capes = FACTION_CAPE_CONTENT.filter((cape) => cape.factionId === factionId);
      expect(capes.map((cape) => [
        cape.tier,
        cape.stats.stat_armor,
        cape.stats.stat_magic_resistance,
        cape.clothQuantity,
        cape.leatherQuantity,
        cape.runeQuantity,
        cape.dungeonDamageReductionPercent,
      ])).toEqual(EXPECTED_BALANCE);
      expect(capes.every((cape) => cape.stats.stat_max_health === undefined)).toBe(true);
    }
  });

  it("uses the shared tiered faction Rune in every authored Cape recipe", () => {
    expect(FACTION_CAPE_CRAFT_RECIPES).toHaveLength(20);
    for (const cape of FACTION_CAPE_CONTENT) {
      const recipe = FACTION_CAPE_CRAFT_RECIPES.find((entry) => entry.outputItemId === cape.itemId);
      expect(recipe?.requirements).toContainEqual({ itemId: cape.runeItemId, quantity: cape.runeQuantity });
      expect(cape.runeItemId).toBe(getFactionRuneItemId(cape.tier));
    }
  });

  it("registers every faction Cape as ordinary equipment", () => {
    for (const factionId of FACTIONS) {
      expect(resolveEquipmentInfo(`item_cape_t4_${factionId}`)).toMatchObject({
        itemId: `item_cape_t4_${factionId}`,
        slot: "cape",
        stats: { stat_armor: 3, stat_magic_resistance: 5 },
      });
    }
  });

  it("reuses generic enchantment scaling for faction Runes", () => {
    for (const factionId of FACTIONS) {
      const runeId = getFactionRuneItemId(4);
      const info = resolveEnchantmentItemInfo(`item_cape_t4_${factionId}`);
      expect(info?.maximumLevel).toBe(3);
      expect(info?.craftMaterials).toContainEqual({ itemId: runeId, quantity: 3 });
      const runeQuantities = ([0, 1, 2] as const).map((index) => {
        const recipe = getNextEnchantmentRecipe(index);
        if (recipe === undefined || info === undefined) return undefined;
        return scaleEnchantmentRecipe(recipe, info.itemTier, info.costCategory, info.craftMaterials)
          .materials.find((material) => material.itemId === runeId)?.quantity;
      });
      expect(runeQuantities).toEqual([3, 6, 12]);
    }
  });

  it("activates resistance only in the matching faction at same or higher dungeon tier", () => {
    for (const factionId of FACTIONS) {
      expect(resolveFactionCapeDungeonDamageReductionPercent(
        `item_cape_t4_${factionId}`,
        { factionId, tier: 8 },
      )).toBe(6);
      expect(resolveFactionCapeDungeonDamageReductionPercent(
        `item_cape_t6_${factionId}`,
        { factionId, tier: 5 },
      )).toBe(0);
      const otherFaction = FACTIONS.find((candidate) => candidate !== factionId) ?? "keeper";
      expect(resolveFactionCapeDungeonDamageReductionPercent(
        `item_cape_t8_${factionId}`,
        { factionId: otherFaction, tier: 8 },
      )).toBe(0);
    }
  });
});
