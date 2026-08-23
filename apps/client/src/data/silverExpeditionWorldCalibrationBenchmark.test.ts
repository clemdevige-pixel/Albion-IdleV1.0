import { describe, expect, it } from "vitest";
import { getEncounterRewards } from "@game/gameplay";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT, getWorldZonePlacement } from "./worldContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;

const TIER_PROFILE: Readonly<Record<Tier, { mastery: number; enchantment: Enchantment }>> = {
  4: { mastery: 23, enchantment: 3 },
  5: { mastery: 36, enchantment: 3 },
  6: { mastery: 46, enchantment: 3 },
  7: { mastery: 56, enchantment: 3 },
  8: { mastery: 65, enchantment: 3 },
};

const WEAPON_BY_TIER: Readonly<Record<Tier, readonly string[]>> = {
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
};

const SEGMENT_CANDIDATES = [8, 6, 4, 2, 0] as const;

function armorForTier(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorForTier(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function segmentSilver(zoneDefId: string, segmentIndex: number): number {
  const placement = getWorldZonePlacement(zoneDefId);
  let silver = 0;
  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    silver += getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    ).silver;
  }
  return silver;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round0(value: number): number {
  return Math.round(value);
}

describe("Silver expedition world calibration benchmark", () => {
  it("prints deepest farmable Silver/h and enchantment-shard/h baselines for T4-T8", () => {
    const rows = ([4, 5, 6, 7, 8] as const).map((tier) => {
      const profile = TIER_PROFILE[tier];
      const zones = Object.values(WORLD_ZONE_CONTENT).filter((zone) => zone.tier === tier);
      let selected: null | {
        zoneName: string;
        zoneDefId: string;
        segmentIndex: number;
        silverPerHour: readonly number[];
        shardsPerHour: readonly number[];
        clearWeapons: number;
      } = null;

      for (const zone of [...zones].reverse()) {
        for (const segmentIndex of SEGMENT_CANDIDATES) {
          const results = WEAPON_BY_TIER[tier].map((weaponItemId) => runEnchantmentShardTtkBenchmark({
            label: `silver_expedition_calibration_t${String(tier)}_${String(zone.id)}_s${String(segmentIndex + 1)}_${weaponItemId}`,
            weaponItemId,
            zoneDefId: zone.id,
            segmentIndex,
            equipmentItemIds: equipmentFor(weaponItemId, tier),
            masteryLevel: profile.mastery,
            enchantment: profile.enchantment,
            useHealthPotions: false,
          }));
          const clears = results.filter((result) => result.clear);
          if (clears.length < 3) continue;

          const silverPerSegment = segmentSilver(zone.id, segmentIndex);
          selected = {
            zoneName: zone.name,
            zoneDefId: zone.id,
            segmentIndex,
            silverPerHour: clears.map((result) => silverPerSegment * (3600 / result.seconds)),
            shardsPerHour: clears.map((result) => result.expectedShardsPerHour),
            clearWeapons: clears.length,
          };
          break;
        }
        if (selected !== null) break;
      }

      if (selected === null) {
        return {
          tier: `T${String(tier)}`,
          reference: "-",
          clearWeapons: 0,
          avgSilverPerHour: null,
          minSilverPerHour: null,
          maxSilverPerHour: null,
          avgShardsPerHour: null,
          minShardsPerHour: null,
          maxShardsPerHour: null,
        };
      }

      const average = (values: readonly number[]): number => (
        values.reduce((sum, value) => sum + value, 0) / values.length
      );

      return {
        tier: `T${String(tier)}`,
        reference: `${selected.zoneName} S${String(selected.segmentIndex + 1)}`,
        clearWeapons: selected.clearWeapons,
        avgSilverPerHour: round0(average(selected.silverPerHour)),
        minSilverPerHour: round0(Math.min(...selected.silverPerHour)),
        maxSilverPerHour: round0(Math.max(...selected.silverPerHour)),
        avgShardsPerHour: round1(average(selected.shardsPerHour)),
        minShardsPerHour: round1(Math.min(...selected.shardsPerHour)),
        maxShardsPerHour: round1(Math.max(...selected.shardsPerHour)),
      };
    });

    console.log("[SILVER_EXPEDITION_WORLD_CALIBRATION]");
    console.table(rows);

    expect(rows).toHaveLength(5);
    expect(rows.slice(0, 4).every((row) => row.clearWeapons >= 3)).toBe(true);
  });
});
