import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";
import {
  BASE_COMBAT_DROP_RATES,
  BOSS_SPECIAL_DROP_MULTIPLIER,
  KEY_FRAGMENTS_PER_KEY,
  getDungeonKeyProgressionWeight,
} from "./economyContentCatalog.js";

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

const SEGMENT_SAMPLES = [0, 2, 4, 6, 8] as const;
const ENCOUNTERS_PER_WORLD_SEGMENT = 5;
const NORMAL_ENCOUNTERS_PER_SEGMENT = 4;

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function zonesForTier(tier: Tier) {
  return Object.values(WORLD_ZONE_CONTENT).filter((zone) => zone.tier === tier);
}

function expectedDropsPerSegment(baseRate: number, progressionWeight: number): number {
  return baseRate
    * progressionWeight
    * (NORMAL_ENCOUNTERS_PER_SEGMENT + BOSS_SPECIAL_DROP_MULTIPLIER);
}

function projectedPerHour(expectedPerSegment: number, segmentSeconds: number): number {
  if (segmentSeconds <= 0) return 0;
  return expectedPerSegment * (3600 / segmentSeconds);
}

describe("Dungeon key world-drop calibration benchmark", () => {
  it("measures fragment, complete-key and key-equivalent yields across T4-T8 world depth", () => {
    const rows: Array<{
      tier: string;
      zoneIndex: number;
      zone: string;
      segment: number;
      clearWeapons: number;
      clearRatePct: number;
      avgKillsPerHour: number | null;
      keyDropWeight: number;
      fragmentsPerHour: number | null;
      completeKeysPerHour: number | null;
      keyEquivalentPerHour: number | null;
    }> = [];

    for (const tier of [4, 5, 6, 7, 8] as const) {
      const profile = TIER_PROFILE[tier];
      const zones = zonesForTier(tier);

      zones.forEach((zone, zoneIndex) => {
        for (const segmentIndex of SEGMENT_SAMPLES) {
          const fragmentYields: number[] = [];
          const completeKeyYields: number[] = [];
          const killsPerHour: number[] = [];
          const keyDropWeight = getDungeonKeyProgressionWeight(
            zone.bandId,
            zoneIndex,
            segmentIndex,
          );
          const expectedFragmentsPerSegment = expectedDropsPerSegment(
            BASE_COMBAT_DROP_RATES.keyFragment,
            keyDropWeight,
          );
          const expectedCompleteKeysPerSegment = expectedDropsPerSegment(
            BASE_COMBAT_DROP_RATES.completeKey,
            keyDropWeight,
          );

          for (const weaponItemId of WEAPON_BY_TIER[tier]) {
            const result = runCombatRuntimeBenchmark({
              label: `dungeon_key_world_t${String(tier)}_${String(zone.id)}_s${String(segmentIndex + 1)}_${weaponItemId}`,
              weaponItemId,
              zoneDefId: zone.id,
              segmentIndex,
              equipmentItemIds: equipmentFor(weaponItemId, tier),
              masteryLevel: profile.mastery,
              enchantment: profile.enchantment,
              useHealthPotions: false,
            });
            if (!result.clear) continue;

            killsPerHour.push((ENCOUNTERS_PER_WORLD_SEGMENT / result.seconds) * 3600);
            fragmentYields.push(projectedPerHour(expectedFragmentsPerSegment, result.seconds));
            completeKeyYields.push(projectedPerHour(expectedCompleteKeysPerSegment, result.seconds));
          }

          const average = (values: readonly number[]): number | null => (
            values.length === 0
              ? null
              : values.reduce((sum, value) => sum + value, 0) / values.length
          );
          const avgFragments = average(fragmentYields);
          const avgCompleteKeys = average(completeKeyYields);

          rows.push({
            tier: `T${String(tier)}`,
            zoneIndex: zoneIndex + 1,
            zone: zone.name,
            segment: segmentIndex + 1,
            clearWeapons: fragmentYields.length,
            clearRatePct: round2((fragmentYields.length / WEAPON_BY_TIER[tier].length) * 100),
            avgKillsPerHour: average(killsPerHour) === null ? null : round2(average(killsPerHour) ?? 0),
            keyDropWeight: round2(keyDropWeight),
            fragmentsPerHour: avgFragments === null ? null : round2(avgFragments),
            completeKeysPerHour: avgCompleteKeys === null ? null : round2(avgCompleteKeys),
            keyEquivalentPerHour: avgFragments === null || avgCompleteKeys === null
              ? null
              : round2(avgCompleteKeys + avgFragments / KEY_FRAGMENTS_PER_KEY),
          });
        }
      });
    }

    const summary = ([4, 5, 6, 7, 8] as const).map((tier) => {
      const farmable = rows.filter(
        (row) => row.tier === `T${String(tier)}`
          && row.clearRatePct >= 60
          && row.keyEquivalentPerHour !== null,
      );
      const first = farmable[0];
      const deepest = farmable[farmable.length - 1];
      return {
        tier: `T${String(tier)}`,
        firstFarmable: first === undefined ? "-" : `${first.zone} S${String(first.segment)}`,
        firstFragmentsPerHour: first?.fragmentsPerHour ?? null,
        firstCompleteKeysPerHour: first?.completeKeysPerHour ?? null,
        firstKeyEquivalentPerHour: first?.keyEquivalentPerHour ?? null,
        deepestFarmable: deepest === undefined ? "-" : `${deepest.zone} S${String(deepest.segment)}`,
        deepestFragmentsPerHour: deepest?.fragmentsPerHour ?? null,
        deepestCompleteKeysPerHour: deepest?.completeKeysPerHour ?? null,
        deepestKeyEquivalentPerHour: deepest?.keyEquivalentPerHour ?? null,
      };
    });

    console.log("[DUNGEON_KEY_WORLD_DEPTH_ROWS]");
    console.table(rows);
    console.log("[DUNGEON_KEY_WORLD_TIER_SUMMARY]");
    console.table(summary);

    expect(rows.length).toBeGreaterThan(0);
    expect(summary).toHaveLength(5);
    expect(rows.every((row) => row.clearRatePct >= 0 && row.clearRatePct <= 100)).toBe(true);
  });
});
