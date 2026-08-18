import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

const WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
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

const CANDIDATE = { 1: 5, 2: 15, 3: 30 } as const;
const LOADOUT_COST_UNITS = 4; // weapon package (2H or 1H+off-hand) + head + chest + boots

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

function nameOf(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function rate(weaponItemId: string, zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS], segmentIndex: number, enchantment: 0 | 1 | 2 | 3, masteryLevel: number) {
  const result = runEnchantmentShardTtkBenchmark({
    label: "candidate",
    weaponItemId,
    zoneDefId,
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel,
    enchantment,
    useHealthPotions: false,
  });
  return {
    clear: result.clear,
    shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
    seconds: result.seconds,
    hpPercent: result.hpPercent,
  };
}

describe("5/15/30 enchantment pacing candidate", () => {
  it("projects full-loadout pacing from live shard/TTK rates and finds the best autonomous .2 farm", () => {
    const rows = WEAPONS.map((weaponItemId) => {
      const steppe0 = rate(weaponItemId, WORLD_ZONE_IDS.steppe, 5, 0, 16);
      const steppe1 = rate(weaponItemId, WORLD_ZONE_IDS.steppe, 7, 1, 17);
      const steppe2 = rate(weaponItemId, WORLD_ZONE_IDS.steppe, 7, 2, 21);

      const mountain = Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentIndex,
        ...rate(weaponItemId, WORLD_ZONE_IDS.mountain, segmentIndex, 2, 21),
      })).filter((row) => row.clear && row.shardsPerHour > 0);

      const candidates = [
        { farm: "steppe_s8", segmentIndex: 7, ...steppe2 },
        ...mountain.map((row) => ({ farm: `mountain_s${row.segmentIndex + 1}`, ...row })),
      ].filter((row) => row.clear && row.shardsPerHour > 0);

      candidates.sort((a, b) => b.shardsPerHour - a.shardsPerHour);
      const best2 = candidates[0];
      if (best2 === undefined) throw new Error(`No autonomous .2 shard farm for ${weaponItemId}`);

      const shardsFull1 = CANDIDATE[1] * LOADOUT_COST_UNITS;
      const shardsFull2Increment = CANDIDATE[2] * LOADOUT_COST_UNITS;
      const shardsFull3Increment = CANDIDATE[3] * LOADOUT_COST_UNITS;

      const hoursToFull1 = shardsFull1 / steppe0.shardsPerHour;
      const hoursFull1To2 = shardsFull2Increment / steppe1.shardsPerHour;
      const hoursFull2To3 = shardsFull3Increment / best2.shardsPerHour;
      const totalHours = hoursToFull1 + hoursFull1To2 + hoursFull2To3;

      return {
        weapon: nameOf(weaponItemId),
        steppe0Rate: steppe0.shardsPerHour,
        steppe1Rate: steppe1.shardsPerHour,
        steppe2Rate: steppe2.shardsPerHour,
        bestDot2Farm: best2.farm,
        bestDot2Rate: best2.shardsPerHour,
        full1Minutes: Number((hoursToFull1 * 60).toFixed(1)),
        full2CumulativeMinutes: Number(((hoursToFull1 + hoursFull1To2) * 60).toFixed(1)),
        full3CumulativeMinutes: Number((totalHours * 60).toFixed(1)),
        full3FromSpawnApproxMinutes: Number((totalHours * 60 + 30).toFixed(1)),
      };
    });

    console.table(rows);
    console.log("[ENCHANTMENT_5_15_30_PACING]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(WEAPONS.length);
    expect(rows.every((row) => row.steppe0Rate > 0 && row.steppe1Rate > 0 && row.bestDot2Rate > 0)).toBe(true);
  });
});
