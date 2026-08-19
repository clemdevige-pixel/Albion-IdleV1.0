import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

const WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

const ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;

const SHIELD = "item_shield_t4_reinforced";

const BLUE_ZONES = [
  { id: "forest", zoneDefId: WORLD_ZONE_IDS.forest },
  { id: "swamp", zoneDefId: WORLD_ZONE_IDS.swamp },
  { id: "highland", zoneDefId: WORLD_ZONE_IDS.highland },
  { id: "steppe", zoneDefId: WORLD_ZONE_IDS.steppe },
  { id: "mountain", zoneDefId: WORLD_ZONE_IDS.mountain },
] as const;

const ENCHANTMENT_STAGES = [
  { enchantment: 0, masteryLevel: 16 },
  { enchantment: 1, masteryLevel: 17 },
  { enchantment: 2, masteryLevel: 21 },
  { enchantment: 3, masteryLevel: 22 },
] as const;

const NEXT_FULL_SET_SHARD_COST: Readonly<Record<number, number | null>> = {
  0: 50,
  1: 150,
  2: 300,
  3: null,
};

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function spotDepth(zoneIndex: number, segmentIndex: number): number {
  return zoneIndex * 10 + segmentIndex;
}

function hoursFor(shards: number | null, shardsPerHour: number): number | null {
  if (shards === null || shardsPerHour <= 0) return null;
  return Number((shards / shardsPerHour).toFixed(2));
}

describe("enchantment shard AFK farm sweep", () => {
  it("finds real Blue farm spots and time-to-next-enchantment by weapon and zone", () => {
    const summaries = ENCHANTMENT_STAGES.map((stage) => {
      const rows = BLUE_ZONES.flatMap((zone, zoneIndex) =>
        Array.from({ length: 10 }, (_, segmentIndex) =>
          WEAPONS.map((weaponItemId) => {
            const result = runEnchantmentShardTtkBenchmark({
              label: `t4_${String(stage.enchantment)}_${zone.id}_s${String(segmentIndex + 1)}`,
              weaponItemId,
              zoneDefId: zone.zoneDefId,
              segmentIndex,
              equipmentItemIds: equipmentFor(weaponItemId),
              masteryLevel: stage.masteryLevel,
              enchantment: stage.enchantment,
              useHealthPotions: false,
            });

            return {
              enchantment: stage.enchantment,
              mastery: stage.masteryLevel,
              zone: zone.id,
              zoneIndex,
              segment: segmentIndex + 1,
              segmentIndex,
              weapon: shortName(weaponItemId),
              clear: result.clear,
              hpPercent: result.hpPercent,
              segmentSeconds: result.seconds,
              shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
              depth: spotDepth(zoneIndex, segmentIndex),
            };
          }),
        ).flat(),
      );

      const nextFullSetCost = NEXT_FULL_SET_SHARD_COST[stage.enchantment] ?? null;

      const bestByWeaponAndZone = WEAPONS.flatMap((weaponItemId) => {
        const weapon = shortName(weaponItemId);
        return BLUE_ZONES.map((zone) => {
          const clearRows = rows.filter(
            (row) => row.weapon === weapon && row.zone === zone.id && row.clear,
          );
          const best = clearRows.reduce<(typeof clearRows)[number] | undefined>(
            (current, row) => current === undefined || row.shardsPerHour > current.shardsPerHour ? row : current,
            undefined,
          );

          if (best === undefined) {
            return {
              weapon,
              zone: zone.id,
              bestSegment: null,
              shardsPerHour: 0,
              hpPercent: 0,
              nextFullSetShards: nextFullSetCost,
              hoursToNextFullSet: null,
            };
          }

          return {
            weapon,
            zone: zone.id,
            bestSegment: best.segment,
            shardsPerHour: best.shardsPerHour,
            hpPercent: best.hpPercent,
            nextFullSetShards: nextFullSetCost,
            hoursToNextFullSet: hoursFor(nextFullSetCost, best.shardsPerHour),
          };
        });
      });

      const bestByWeapon = WEAPONS.map((weaponItemId) => {
        const weapon = shortName(weaponItemId);
        const weaponZoneRows = bestByWeaponAndZone.filter((row) => row.weapon === weapon);
        const best = weaponZoneRows.reduce<(typeof weaponZoneRows)[number] | undefined>(
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

      const commonSpots = BLUE_ZONES.flatMap((zone, zoneIndex) =>
        Array.from({ length: 10 }, (_, segmentIndex) => {
          const spotRows = rows.filter(
            (row) => row.zone === zone.id && row.segmentIndex === segmentIndex,
          );
          if (spotRows.length !== WEAPONS.length || spotRows.some((row) => !row.clear)) return undefined;

          const shardsPerHour = spotRows.map((row) => row.shardsPerHour);
          return {
            zone: zone.id,
            segment: segmentIndex + 1,
            depth: spotDepth(zoneIndex, segmentIndex),
            minShardsPerHour: Math.min(...shardsPerHour),
            avgShardsPerHour: Number(
              (shardsPerHour.reduce((sum, value) => sum + value, 0) / shardsPerHour.length).toFixed(1),
            ),
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
        gear: `T4.${String(stage.enchantment)}`,
        mastery: stage.masteryLevel,
        nextFullSetShards: nextFullSetCost,
        deepestCommon: deepestCommon === undefined
          ? null
          : `${deepestCommon.zone}_s${String(deepestCommon.segment)}`,
        bestCommonFarm: bestCommonFarm === undefined
          ? null
          : `${bestCommonFarm.zone}_s${String(bestCommonFarm.segment)}`,
        bestCommonMinShardsPerHour: bestCommonFarm?.minShardsPerHour ?? 0,
        bestCommonAvgShardsPerHour: bestCommonFarm?.avgShardsPerHour ?? 0,
        worstCaseHoursToNextFullSet: hoursFor(
          nextFullSetCost,
          bestCommonFarm?.minShardsPerHour ?? 0,
        ),
        averageHoursToNextFullSet: hoursFor(
          nextFullSetCost,
          bestCommonFarm?.avgShardsPerHour ?? 0,
        ),
      };

      console.log(`[ENCHANTMENT_FARM_BY_ZONE_T4_${String(stage.enchantment)}]`);
      console.table(bestByWeaponAndZone);
      console.log(`[ENCHANTMENT_FARM_SWEEP_T4_${String(stage.enchantment)}]`);
      console.table(bestByWeapon);
      console.table([summary]);

      return { summary, bestByWeapon, bestByWeaponAndZone };
    });

    console.log("[ENCHANTMENT_FARM_SWEEP_SUMMARY]", JSON.stringify(summaries, null, 2));

    expect(summaries).toHaveLength(ENCHANTMENT_STAGES.length);
    expect(summaries.every(({ bestByWeapon }) => bestByWeapon.length === WEAPONS.length)).toBe(true);
    expect(summaries.every(({ bestByWeaponAndZone }) => bestByWeaponAndZone.length === WEAPONS.length * BLUE_ZONES.length)).toBe(true);
  }, 60_000);
});
