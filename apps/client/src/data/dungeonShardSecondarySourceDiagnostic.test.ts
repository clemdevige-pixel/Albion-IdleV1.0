import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  BASE_COMBAT_DROP_RATES,
  BOSS_SPECIAL_DROP_MULTIPLIER,
  KEY_FRAGMENTS_PER_KEY,
  getDungeonKeyProgressionWeight,
} from "./economyContentCatalog.js";
import { getExpectedEnchantmentShardsPerSegment } from "./enchantmentShardTtkBenchmark.js";

const SHARD_REWARD_CANDIDATES = [25, 50, 75, 100] as const;
const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

const BAND_BY_TIER = {
  4: "blue",
  5: "yellow",
  6: "orange",
  7: "red",
  8: "black",
} as const;

const FINAL_ZONE_BY_TIER = {
  4: WORLD_ZONE_IDS.mountain,
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

const TARGET_MASTERY_BY_TIER = {
  4: 25,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
} as const;

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
  6: [
    "item_weapon_sword_t6_broadsword",
    "item_weapon_bow_t6_longbow",
    "item_weapon_staff_t6_infernal",
    "item_weapon_gloves_t6_spiked_gauntlets",
    "item_weapon_dagger_t6_pair",
  ],
  7: [
    "item_weapon_sword_t7_broadsword",
    "item_weapon_bow_t7_longbow",
    "item_weapon_staff_t7_infernal",
    "item_weapon_gloves_t7_spiked_gauntlets",
    "item_weapon_dagger_t7_pair",
  ],
  8: [
    "item_weapon_sword_t8_broadsword",
    "item_weapon_bow_t8_longbow",
    "item_weapon_staff_t8_infernal",
    "item_weapon_gloves_t8_spiked_gauntlets",
    "item_weapon_dagger_t8_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
  8: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
  8: "item_shield_t8_reinforced",
} as const;

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(SHIELD_BY_TIER[tier]);
  }
  return items;
}

function expectedKeyEquivalentsPerSegment(keyDropWeight: number): number {
  const equivalentKeysPerNormalKill = (
    BASE_COMBAT_DROP_RATES.completeKey
    + BASE_COMBAT_DROP_RATES.keyFragment / KEY_FRAGMENTS_PER_KEY
  ) * keyDropWeight;
  return equivalentKeysPerNormalKill * (4 + BOSS_SPECIAL_DROP_MULTIPLIER);
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

describe("dungeon shards as a secondary enchantment source", () => {
  it("compares full key + dungeon cycles against staying in open-world combat", () => {
    const detail = TIERS.flatMap((tier) => {
      const band = BAND_BY_TIER[tier];
      const finalZone = FINAL_ZONE_BY_TIER[tier];
      const keyDropWeight = getDungeonKeyProgressionWeight(band, 4, 9);
      const expectedWorldShardsPerSegment = getExpectedEnchantmentShardsPerSegment(finalZone, 9);
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);

      return WEAPONS_BY_TIER[tier].flatMap((weaponItemId) => {
        const equipmentItemIds = equipmentFor(weaponItemId, tier);
        const world = runCombatRuntimeBenchmark({
          label: `dungeon_shard_world_T${tier}_${weaponItemId}`,
          weaponItemId,
          zoneDefId: finalZone,
          segmentIndex: 9,
          equipmentItemIds,
          enchantment: 3,
          masteryLevel: TARGET_MASTERY_BY_TIER[tier],
          useHealthPotions: false,
        });
        if (!world.clear || world.seconds <= 0) return [];

        const segmentsPerHour = 3600 / world.seconds;
        const openWorldShardsPerHour = expectedWorldShardsPerSegment * segmentsPerHour;
        const keysPerHour = expectedKeyEquivalentsPerSegment(keyDropWeight) * segmentsPerHour;
        if (openWorldShardsPerHour <= 0 || keysPerHour <= 0) return [];

        const keyFarmHours = 1 / keysPerHour;
        const dungeonResults = dungeons.map((dungeon) => runCombatRuntimeBenchmark({
          label: `dungeon_shard_T${tier}_${dungeon.faction}_${weaponItemId}`,
          weaponItemId,
          zoneDefId: finalZone,
          segmentIndex: 9,
          equipmentItemIds,
          enchantment: 3,
          masteryLevel: TARGET_MASTERY_BY_TIER[tier],
          useHealthPotions: true,
          dungeonDefinitionId: dungeon.id,
        }));
        const cleared = dungeonResults.filter((result) => result.clear && result.seconds > 0);
        if (cleared.length === 0) return [];

        const avgDungeonSeconds = cleared.reduce((sum, result) => sum + result.seconds, 0) / cleared.length;
        const dungeonHours = avgDungeonSeconds / 3600;
        const breakEvenShardsPerDungeon = openWorldShardsPerHour * dungeonHours;
        const worldShardsDuringKeyFarm = openWorldShardsPerHour * keyFarmHours;
        const cycleHours = keyFarmHours + dungeonHours;

        return SHARD_REWARD_CANDIDATES.map((candidateShardsPerDungeon) => {
          const cycleShards = worldShardsDuringKeyFarm + candidateShardsPerDungeon;
          const cycleEffectiveShardsPerHour = cycleShards / cycleHours;
          const accelerationPct = (cycleEffectiveShardsPerHour / openWorldShardsPerHour - 1) * 100;
          return {
            tier: `T${tier}`,
            weapon: weaponItemId,
            candidateShardsPerDungeon,
            dungeonClears: `${cleared.length}/${dungeons.length}`,
            openWorldShardsPerHour: round2(openWorldShardsPerHour),
            keysPerHour: round2(keysPerHour),
            keyFarmHours: round2(keyFarmHours),
            dungeonMinutes: round2(avgDungeonSeconds / 60),
            breakEvenShardsPerDungeon: round2(breakEvenShardsPerDungeon),
            netDungeonBonusShards: round2(candidateShardsPerDungeon - breakEvenShardsPerDungeon),
            cycleEffectiveShardsPerHour: round2(cycleEffectiveShardsPerHour),
            accelerationPct: round1(accelerationPct),
          };
        });
      });
    });

    const summary = TIERS.flatMap((tier) => SHARD_REWARD_CANDIDATES.map((candidateShardsPerDungeon) => {
      const rows = detail.filter((row) => row.tier === `T${tier}` && row.candidateShardsPerDungeon === candidateShardsPerDungeon);
      const accelerations = rows.map((row) => row.accelerationPct);
      const avg = (key: "openWorldShardsPerHour" | "keysPerHour" | "keyFarmHours" | "dungeonMinutes" | "breakEvenShardsPerDungeon" | "cycleEffectiveShardsPerHour") =>
        rows.reduce((sum, row) => sum + row[key], 0) / Math.max(1, rows.length);
      return {
        tier: `T${tier}`,
        candidateShardsPerDungeon,
        avgOpenWorldShardsPerHour: round2(avg("openWorldShardsPerHour")),
        avgKeysPerHour: round2(avg("keysPerHour")),
        avgKeyFarmHours: round2(avg("keyFarmHours")),
        avgDungeonMinutes: round2(avg("dungeonMinutes")),
        avgBreakEvenShardsPerDungeon: round2(avg("breakEvenShardsPerDungeon")),
        avgCycleEffectiveShardsPerHour: round2(avg("cycleEffectiveShardsPerHour")),
        avgAccelerationPct: accelerations.length > 0 ? round1(accelerations.reduce((sum, value) => sum + value, 0) / accelerations.length) : 0,
        minAccelerationPct: accelerations.length > 0 ? Math.min(...accelerations) : 0,
        maxAccelerationPct: accelerations.length > 0 ? Math.max(...accelerations) : 0,
      };
    }));

    console.log("[DUNGEON_SHARD_SECONDARY_SOURCE_SUMMARY]");
    console.table(summary);
    console.log("[DUNGEON_SHARD_SECONDARY_SOURCE_DETAIL]");
    console.table(detail);
    console.log("[DUNGEON_SHARD_SECONDARY_SOURCE_SUMMARY_JSON]", JSON.stringify(summary, null, 2));

    expect(detail.length).toBeGreaterThan(0);
    expect(summary).toHaveLength(TIERS.length * SHARD_REWARD_CANDIDATES.length);
  });
});
