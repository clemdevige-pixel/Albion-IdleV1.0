import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

const CHECKPOINTS = [
  { id: "steppe_s6_t4_0", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 5, masteryLevel: 16, enchantment: 0 as const },
  { id: "steppe_s8_t4_1", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 7, masteryLevel: 17, enchantment: 1 as const },
  { id: "mountain_s8_t4_2", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 7, masteryLevel: 21, enchantment: 2 as const },
  { id: "mountain_s10_t4_3", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, masteryLevel: 22, enchantment: 3 as const },
] as const;

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

describe("enchantment shard TTK economy", () => {
  it("prints live-runtime shards/hour for validated T4 farm checkpoints", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => T4_WEAPONS.map((weaponItemId) => {
      const result = runEnchantmentShardTtkBenchmark({
        label: checkpoint.id,
        weaponItemId,
        zoneDefId: checkpoint.zoneDefId,
        segmentIndex: checkpoint.segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId),
        masteryLevel: checkpoint.masteryLevel,
        enchantment: checkpoint.enchantment,
        useHealthPotions: false,
      });

      return {
        checkpoint: checkpoint.id,
        weapon: shortName(weaponItemId),
        clear: result.clear,
        seconds: result.seconds,
        killsPerHour: Number(result.killsPerHour.toFixed(1)),
        shardsPerSegment: Number(result.expectedShardsPerSegment.toFixed(4)),
        shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
        hpPercent: result.hpPercent,
      };
    }));

    console.table(rows);
    console.log("[ENCHANTMENT_SHARD_TTK_BENCHMARK]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * T4_WEAPONS.length);
    expect(rows.every((row) => row.clear)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.shardsPerHour) && row.shardsPerHour > 0)).toBe(true);
  });
});
