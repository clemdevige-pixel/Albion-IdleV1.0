import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

type Enchantment = 0 | 1 | 2 | 3;
type Tier = 5 | 6 | 7 | 8;

type TierConfig = {
  readonly tier: Tier;
  readonly band: "yellow" | "orange" | "red" | "black";
  readonly zones: readonly { readonly id: string; readonly zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS] }[];
  readonly masteryByEnchantment: Readonly<Record<Enchantment, number>>;
};

const TIER_CONFIGS: readonly TierConfig[] = [
  {
    tier: 5,
    band: "yellow",
    zones: [
      { id: "amberwood", zoneDefId: WORLD_ZONE_IDS.amberwood },
      { id: "gloamfen", zoneDefId: WORLD_ZONE_IDS.gloamfen },
      { id: "stormwatch", zoneDefId: WORLD_ZONE_IDS.stormwatch },
      { id: "sunscar", zoneDefId: WORLD_ZONE_IDS.sunscar },
      { id: "ironveil", zoneDefId: WORLD_ZONE_IDS.ironveil },
    ],
    // Derived from yellowT5ProgressionSweep: latest mastery reached while each
    // enchantment remains the expected full-set progression state.
    masteryByEnchantment: { 0: 27, 1: 31, 2: 35, 3: 35 },
  },
  {
    tier: 6,
    band: "orange",
    zones: [
      { id: "cinderwood", zoneDefId: WORLD_ZONE_IDS.cinderwood },
      { id: "rotfen", zoneDefId: WORLD_ZONE_IDS.rotfen },
      { id: "thundercrag", zoneDefId: WORLD_ZONE_IDS.thundercrag },
      { id: "emberwind", zoneDefId: WORLD_ZONE_IDS.emberwind },
      { id: "ashenpeak", zoneDefId: WORLD_ZONE_IDS.ashenpeak },
    ],
    masteryByEnchantment: { 0: 39, 1: 41, 2: 43, 3: 45 },
  },
  {
    tier: 7,
    band: "red",
    zones: [
      { id: "bloodwood", zoneDefId: WORLD_ZONE_IDS.bloodwood },
      { id: "dreadfen", zoneDefId: WORLD_ZONE_IDS.dreadfen },
      { id: "redspire", zoneDefId: WORLD_ZONE_IDS.redspire },
      { id: "crimsonSteppe", zoneDefId: WORLD_ZONE_IDS.crimsonSteppe },
      { id: "doompeak", zoneDefId: WORLD_ZONE_IDS.doompeak },
    ],
    masteryByEnchantment: { 0: 49, 1: 51, 2: 53, 3: 55 },
  },
  {
    tier: 8,
    band: "black",
    zones: [
      { id: "blackwood", zoneDefId: WORLD_ZONE_IDS.blackwood },
      { id: "shadowfen", zoneDefId: WORLD_ZONE_IDS.shadowfen },
      { id: "obsidianHighlands", zoneDefId: WORLD_ZONE_IDS.obsidianHighlands },
      { id: "duskfallSteppe", zoneDefId: WORLD_ZONE_IDS.duskfallSteppe },
      { id: "blackspire", zoneDefId: WORLD_ZONE_IDS.blackspire },
    ],
    masteryByEnchantment: { 0: 59, 1: 61, 2: 63, 3: 65 },
  },
] as const;

const NEXT_FULL_SET_SHARD_COST: Readonly<Record<Enchantment, number | null>> = {
  0: 50,
  1: 150,
  2: 300,
  3: null,
};

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

function shieldFor(tier: Tier): string {
  return `item_shield_t${tier}_reinforced`;
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorFor(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(shieldFor(tier));
  return items;
}

function shortName(itemId: string, tier: Tier): string {
  return itemId.replace("item_weapon_", "").replace(`_t${tier}_`, " ");
}

function hoursFor(shards: number | null, shardsPerHour: number): number | null {
  if (shards === null || shardsPerHour <= 0) return null;
  return Number((shards / shardsPerHour).toFixed(2));
}

function spotDepth(zoneIndex: number, segmentIndex: number): number {
  return zoneIndex * 10 + segmentIndex;
}

describe("enchantment shard world AFK farm sweep", () => {
  for (const config of TIER_CONFIGS) {
    it(`finds real ${config.band} T${config.tier} farm spots and time-to-next-enchantment`, () => {
      const weapons = weaponsFor(config.tier);
      const summaries = ([0, 1, 2, 3] as const).map((enchantment) => {
        const mastery = config.masteryByEnchantment[enchantment];
        const nextFullSetShards = NEXT_FULL_SET_SHARD_COST[enchantment];

        const rows = config.zones.flatMap((zone, zoneIndex) =>
          Array.from({ length: 10 }, (_, segmentIndex) =>
            weapons.map((weaponItemId) => {
              const result = runEnchantmentShardTtkBenchmark({
                label: `t${config.tier}_${enchantment}_${zone.id}_s${segmentIndex + 1}`,
                weaponItemId,
                zoneDefId: zone.zoneDefId,
                segmentIndex,
                equipmentItemIds: equipmentFor(weaponItemId, config.tier),
                masteryLevel: mastery,
                enchantment,
                useHealthPotions: false,
              });

              return {
                weapon: shortName(weaponItemId, config.tier),
                zone: zone.id,
                zoneIndex,
                segment: segmentIndex + 1,
                segmentIndex,
                clear: result.clear,
                hpPercent: result.hpPercent,
                shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
                depth: spotDepth(zoneIndex, segmentIndex),
              };
            }),
          ).flat(),
        );

        const bestByWeaponAndZone = weapons.flatMap((weaponItemId) => {
          const weapon = shortName(weaponItemId, config.tier);
          return config.zones.map((zone) => {
            const clearRows = rows.filter((row) => row.weapon === weapon && row.zone === zone.id && row.clear);
            const best = clearRows.reduce<(typeof clearRows)[number] | undefined>(
              (current, row) => current === undefined || row.shardsPerHour > current.shardsPerHour ? row : current,
              undefined,
            );

            return best === undefined
              ? {
                  weapon,
                  zone: zone.id,
                  bestSegment: null,
                  shardsPerHour: 0,
                  hpPercent: 0,
                  nextFullSetShards,
                  hoursToNextFullSet: null,
                }
              : {
                  weapon,
                  zone: zone.id,
                  bestSegment: best.segment,
                  shardsPerHour: best.shardsPerHour,
                  hpPercent: best.hpPercent,
                  nextFullSetShards,
                  hoursToNextFullSet: hoursFor(nextFullSetShards, best.shardsPerHour),
                };
          });
        });

        const bestByWeapon = weapons.map((weaponItemId) => {
          const weapon = shortName(weaponItemId, config.tier);
          const weaponRows = bestByWeaponAndZone.filter((row) => row.weapon === weapon);
          const best = weaponRows.reduce<(typeof weaponRows)[number] | undefined>(
            (current, row) => current === undefined || row.shardsPerHour > current.shardsPerHour ? row : current,
            undefined,
          );

          return best === undefined
            ? { weapon, zone: "none", segment: 0, shardsPerHour: 0, hpPercent: 0, hoursToNextFullSet: null }
            : {
                weapon,
                zone: best.zone,
                segment: best.bestSegment ?? 0,
                shardsPerHour: best.shardsPerHour,
                hpPercent: best.hpPercent,
                hoursToNextFullSet: best.hoursToNextFullSet,
              };
        });

        const commonSpots = config.zones.flatMap((zone, zoneIndex) =>
          Array.from({ length: 10 }, (_, segmentIndex) => {
            const spotRows = rows.filter((row) => row.zone === zone.id && row.segmentIndex === segmentIndex);
            if (spotRows.length !== weapons.length || spotRows.some((row) => !row.clear)) return undefined;

            const shardsPerHour = spotRows.map((row) => row.shardsPerHour);
            return {
              zone: zone.id,
              segment: segmentIndex + 1,
              depth: spotDepth(zoneIndex, segmentIndex),
              minShardsPerHour: Math.min(...shardsPerHour),
              avgShardsPerHour: Number((shardsPerHour.reduce((sum, value) => sum + value, 0) / shardsPerHour.length).toFixed(1)),
            };
          }).filter((spot) => spot !== undefined),
        );

        const deepestCommon = commonSpots.reduce<(typeof commonSpots)[number] | undefined>(
          (current, spot) => current === undefined || spot.depth > current.depth ? spot : current,
          undefined,
        );
        const bestCommonFarm = commonSpots.reduce<(typeof commonSpots)[number] | undefined>(
          (current, spot) => current === undefined || spot.minShardsPerHour > current.minShardsPerHour ? spot : current,
          undefined,
        );

        const summary = {
          band: config.band,
          gear: `T${config.tier}.${enchantment}`,
          mastery,
          nextFullSetShards,
          deepestCommon: deepestCommon === undefined ? null : `${deepestCommon.zone}_s${deepestCommon.segment}`,
          bestCommonFarm: bestCommonFarm === undefined ? null : `${bestCommonFarm.zone}_s${bestCommonFarm.segment}`,
          bestCommonMinShardsPerHour: bestCommonFarm?.minShardsPerHour ?? 0,
          bestCommonAvgShardsPerHour: bestCommonFarm?.avgShardsPerHour ?? 0,
          worstCaseHoursToNextFullSet: hoursFor(nextFullSetShards, bestCommonFarm?.minShardsPerHour ?? 0),
          averageHoursToNextFullSet: hoursFor(nextFullSetShards, bestCommonFarm?.avgShardsPerHour ?? 0),
        };

        console.log(`[ENCHANTMENT_FARM_BY_ZONE_T${config.tier}_${enchantment}]`);
        console.table(bestByWeaponAndZone);
        console.log(`[ENCHANTMENT_FARM_SWEEP_T${config.tier}_${enchantment}]`);
        console.table(bestByWeapon);
        console.table([summary]);

        return { summary, bestByWeapon, bestByWeaponAndZone };
      });

      console.log(`[ENCHANTMENT_FARM_SWEEP_SUMMARY_T${config.tier}]`, JSON.stringify(summaries, null, 2));

      expect(summaries).toHaveLength(4);
      expect(summaries.every(({ bestByWeapon }) => bestByWeapon.length === weapons.length)).toBe(true);
      expect(summaries.every(({ bestByWeaponAndZone }) => bestByWeaponAndZone.length === weapons.length * config.zones.length)).toBe(true);
    }, 180_000);
  }
});
