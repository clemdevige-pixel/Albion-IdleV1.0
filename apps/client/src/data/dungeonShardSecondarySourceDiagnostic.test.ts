import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, getWorldZonePlacement } from "./worldContentCatalog.js";
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

const TARGET_MASTERY_BY_TIER = {
  4: 25,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
} as const;

function weaponsFor(tier: Tier): readonly string[] {
  return [
    `item_weapon_sword_t${tier}_broadsword`,
    `item_weapon_bow_t${tier}_longbow`,
    `item_weapon_staff_t${tier}_infernal`,
    `item_weapon_gloves_t${tier}_spiked_gauntlets`,
    `item_weapon_dagger_t${tier}_pair`,
  ];
}

function armorFor(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorFor(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${tier}_reinforced`);
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
  it("compares real key-farm + dungeon cycles against the best real shard-farm alternative", () => {
    const detail = TIERS.flatMap((tier) => {
      const band = BAND_BY_TIER[tier];
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      const zones = WORLD_ZONE_IDS_BY_BAND[band];

      return weaponsFor(tier).flatMap((weaponItemId) => {
        const equipmentItemIds = equipmentFor(weaponItemId, tier);

        const farmSpots = zones.flatMap((zoneDefId) => {
          const placement = getWorldZonePlacement(zoneDefId);
          return Array.from({ length: 10 }, (_, segmentIndex) => {
            const runtime = runCombatRuntimeBenchmark({
              label: `dungeon_shard_farm_T${tier}_${weaponItemId}_${String(zoneDefId)}_s${segmentIndex + 1}`,
              weaponItemId,
              zoneDefId,
              segmentIndex,
              equipmentItemIds,
              enchantment: 3,
              masteryLevel: TARGET_MASTERY_BY_TIER[tier],
              useHealthPotions: false,
            });

            if (!runtime.clear || runtime.seconds <= 0) return undefined;

            const segmentsPerHour = 3600 / runtime.seconds;
            const shardPerSegment = getExpectedEnchantmentShardsPerSegment(zoneDefId, segmentIndex);
            const keyDropWeight = getDungeonKeyProgressionWeight(
              band,
              placement.zoneIndexWithinBand,
              segmentIndex,
            );

            return {
              zoneDefId,
              segmentIndex,
              shardsPerHour: shardPerSegment * segmentsPerHour,
              keysPerHour: expectedKeyEquivalentsPerSegment(keyDropWeight) * segmentsPerHour,
            };
          }).filter((spot) => spot !== undefined);
        });

        if (farmSpots.length === 0) return [];

        const bestShardSpot = farmSpots.reduce((best, spot) =>
          spot.shardsPerHour > best.shardsPerHour ? spot : best,
        );
        const bestKeySpot = farmSpots.reduce((best, spot) =>
          spot.keysPerHour > best.keysPerHour ? spot : best,
        );

        if (bestShardSpot.shardsPerHour <= 0 || bestKeySpot.keysPerHour <= 0) return [];

        const keyFarmHours = 1 / bestKeySpot.keysPerHour;
        const worldShardsDuringKeyFarm = bestKeySpot.shardsPerHour * keyFarmHours;

        const dungeonResults = dungeons.map((dungeon) => runCombatRuntimeBenchmark({
          label: `dungeon_shard_T${tier}_${dungeon.faction}_${weaponItemId}`,
          weaponItemId,
          zoneDefId: bestKeySpot.zoneDefId,
          segmentIndex: bestKeySpot.segmentIndex,
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
        const cycleHours = keyFarmHours + dungeonHours;
        const baselineCycleShards = bestShardSpot.shardsPerHour * cycleHours;
        const breakEvenReward = baselineCycleShards - worldShardsDuringKeyFarm;

        return SHARD_REWARD_CANDIDATES.map((candidateShardsPerDungeon) => {
          const cycleShards = worldShardsDuringKeyFarm + candidateShardsPerDungeon;
          const cycleEffectiveShardsPerHour = cycleShards / cycleHours;
          const accelerationPct = (cycleEffectiveShardsPerHour / bestShardSpot.shardsPerHour - 1) * 100;

          return {
            tier: `T${tier}`,
            weapon: weaponItemId,
            candidateShardsPerDungeon,
            dungeonClears: `${cleared.length}/${dungeons.length}`,
            bestShardSpot: `${String(bestShardSpot.zoneDefId)} s${bestShardSpot.segmentIndex + 1}`,
            bestKeySpot: `${String(bestKeySpot.zoneDefId)} s${bestKeySpot.segmentIndex + 1}`,
            openWorldShardsPerHour: round2(bestShardSpot.shardsPerHour),
            keyFarmSpotShardsPerHour: round2(bestKeySpot.shardsPerHour),
            keysPerHour: round2(bestKeySpot.keysPerHour),
            keyFarmHours: round2(keyFarmHours),
            dungeonMinutes: round2(avgDungeonSeconds / 60),
            breakEvenShardsPerDungeon: round2(breakEvenReward),
            netDungeonBonusShards: round2(candidateShardsPerDungeon - breakEvenReward),
            cycleEffectiveShardsPerHour: round2(cycleEffectiveShardsPerHour),
            accelerationPct: round1(accelerationPct),
          };
        });
      });
    });

    const summary = TIERS.flatMap((tier) => SHARD_REWARD_CANDIDATES.map((candidateShardsPerDungeon) => {
      const rows = detail.filter((row) => row.tier === `T${tier}` && row.candidateShardsPerDungeon === candidateShardsPerDungeon);
      const accelerations = rows.map((row) => row.accelerationPct);
      const avg = (key: "openWorldShardsPerHour" | "keyFarmSpotShardsPerHour" | "keysPerHour" | "keyFarmHours" | "dungeonMinutes" | "breakEvenShardsPerDungeon" | "cycleEffectiveShardsPerHour") =>
        rows.reduce((sum, row) => sum + row[key], 0) / Math.max(1, rows.length);

      return {
        tier: `T${tier}`,
        candidateShardsPerDungeon,
        profiles: rows.length,
        avgOpenWorldShardsPerHour: round2(avg("openWorldShardsPerHour")),
        avgKeyFarmSpotShardsPerHour: round2(avg("keyFarmSpotShardsPerHour")),
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
    expect(summary.every((row) => row.profiles > 0)).toBe(true);
  });
});
