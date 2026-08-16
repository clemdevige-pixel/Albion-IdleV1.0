import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

const WEAPONS_BY_TIER = {
  4: [
    "item_weapon_sword_t4_broadsword",
    "item_weapon_bow_t4_longbow",
    "item_weapon_staff_t4_infernal",
    "item_weapon_gloves_t4_spiked_gauntlets",
    "item_weapon_dagger_t4_pair",
  ],
  5: [
    "item_weapon_sword_t5_broadsword",
    "item_weapon_bow_t5_longbow",
    "item_weapon_staff_t5_infernal",
    "item_weapon_gloves_t5_spiked_gauntlets",
    "item_weapon_dagger_t5_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  4: [
    "item_helmet_t4_reinforced",
    "item_armor_t4_leather",
    "item_boots_t4_leather",
    "item_traveler_cape",
  ],
  5: [
    "item_helmet_t5_reinforced",
    "item_armor_t5_leather",
    "item_boots_t5_leather",
    "item_traveler_cape",
  ],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
} as const;

type Tier = keyof typeof WEAPONS_BY_TIER;
type Enchantment = 0 | 1 | 2 | 3;

type Checkpoint = {
  readonly id: string;
  readonly band: "blue" | "yellow";
  readonly zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS];
  readonly segmentIndex: number;
  readonly tier: Tier;
  readonly masteryLevel: number;
  readonly enchantment: Enchantment;
};

/**
 * Economy checkpoints aligned with the current progression walls. A failed row
 * is still useful information: it means that weapon cannot autonomously farm
 * that exact checkpoint and must use an earlier accessible segment instead.
 */
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "steppe_s6_t4_0", band: "blue", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 5, tier: 4, masteryLevel: 16, enchantment: 0 },
  { id: "steppe_s8_t4_1", band: "blue", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 7, tier: 4, masteryLevel: 17, enchantment: 1 },
  { id: "mountain_s8_t4_2", band: "blue", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 7, tier: 4, masteryLevel: 21, enchantment: 2 },
  { id: "mountain_s10_t4_3", band: "blue", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, masteryLevel: 22, enchantment: 3 },
  { id: "amberwood_s10_t5_1", band: "yellow", zoneDefId: WORLD_ZONE_IDS.amberwood, segmentIndex: 9, tier: 5, masteryLevel: 25, enchantment: 1 },
  { id: "gloamfen_s10_t5_1", band: "yellow", zoneDefId: WORLD_ZONE_IDS.gloamfen, segmentIndex: 9, tier: 5, masteryLevel: 27, enchantment: 1 },
  { id: "stormwatch_s10_t5_2", band: "yellow", zoneDefId: WORLD_ZONE_IDS.stormwatch, segmentIndex: 9, tier: 5, masteryLevel: 29, enchantment: 2 },
  { id: "sunscar_s10_t5_2", band: "yellow", zoneDefId: WORLD_ZONE_IDS.sunscar, segmentIndex: 9, tier: 5, masteryLevel: 32, enchantment: 2 },
  { id: "ironveil_s10_t5_3", band: "yellow", zoneDefId: WORLD_ZONE_IDS.ironveil, segmentIndex: 9, tier: 5, masteryLevel: 35, enchantment: 3 },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function shortName(itemId: string, tier: Tier): string {
  return itemId.replace("item_weapon_", "").replace(`_t${tier}_`, " ");
}

describe("enchantment shard TTK economy", () => {
  it("prints live-runtime TTK and shards/hour through Blue and Yellow progression checkpoints", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => WEAPONS_BY_TIER[checkpoint.tier].map((weaponItemId) => {
      const result = runEnchantmentShardTtkBenchmark({
        label: checkpoint.id,
        weaponItemId,
        zoneDefId: checkpoint.zoneDefId,
        segmentIndex: checkpoint.segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, checkpoint.tier),
        masteryLevel: checkpoint.masteryLevel,
        enchantment: checkpoint.enchantment,
        useHealthPotions: false,
      });

      return {
        band: checkpoint.band,
        checkpoint: checkpoint.id,
        weapon: shortName(weaponItemId, checkpoint.tier),
        clear: result.clear,
        segmentSeconds: result.seconds,
        avgTtkSeconds: Number((result.seconds / 5).toFixed(2)),
        killsPerHour: Number(result.killsPerHour.toFixed(1)),
        shardsPerKill: Number(result.expectedShardsPerKill.toFixed(4)),
        shardsPerSegment: Number(result.expectedShardsPerSegment.toFixed(4)),
        shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
        hpPercent: result.hpPercent,
        tier: checkpoint.tier,
        enchantment: checkpoint.enchantment,
        mastery: checkpoint.masteryLevel,
      };
    }));

    console.table(rows);
    console.log("[ENCHANTMENT_SHARD_TTK_BENCHMARK]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.avgTtkSeconds) && row.avgTtkSeconds > 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.shardsPerHour) && row.shardsPerHour >= 0)).toBe(true);
    expect(rows.filter((row) => row.clear).every((row) => row.shardsPerHour > 0)).toBe(true);
    expect(rows.filter((row) => !row.clear).every((row) => row.shardsPerHour === 0)).toBe(true);
  });
});
