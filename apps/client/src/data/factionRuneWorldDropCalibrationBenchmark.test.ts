import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { getFactionMasteryYieldBonusPercent } from "./factionMasteryContentCatalog.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;

const TARGET_WORLD_RUNES_PER_HOUR: Readonly<Record<Tier, number>> = {
  4: 6,
  5: 10,
  6: 18,
  7: 30,
  8: 45,
};

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
const MASTERY_LEVELS = [0, 25, 50, 75, 100] as const;
const ENCOUNTERS_PER_WORLD_SEGMENT = 5;

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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function zonesForTier(tier: Tier) {
  return Object.values(WORLD_ZONE_CONTENT).filter((zone) => zone.tier === tier);
}

describe("Faction Rune world-drop calibration benchmark", () => {
  it("measures rune-drop economics across world progression depth", () => {
    const depthRows: Array<{
      tier: string;
      zoneIndex: number;
      zone: string;
      segment: number;
      clearWeapons: number;
      clearRatePct: number;
      avgKillsPerHour: number | null;
      minKillsPerHour: number | null;
      maxKillsPerHour: number | null;
      procChanceForTierTargetPct: number | null;
    }> = [];

    for (const tier of [4, 5, 6, 7, 8] as const) {
      const profile = TIER_PROFILE[tier];
      const targetRunesPerHour = TARGET_WORLD_RUNES_PER_HOUR[tier];
      const zones = zonesForTier(tier);

      zones.forEach((zone, zoneIndex) => {
        for (const segmentIndex of SEGMENT_SAMPLES) {
          const killsPerHourByClearingWeapon: number[] = [];

          for (const weaponItemId of WEAPON_BY_TIER[tier]) {
            const result = runCombatRuntimeBenchmark({
              label: `faction_rune_world_t${String(tier)}_${String(zone.id)}_s${String(segmentIndex + 1)}_${weaponItemId}`,
              weaponItemId,
              zoneDefId: zone.id,
              segmentIndex,
              equipmentItemIds: equipmentFor(weaponItemId, tier),
              masteryLevel: profile.mastery,
              enchantment: profile.enchantment,
              useHealthPotions: false,
            });
            if (!result.clear) continue;
            killsPerHourByClearingWeapon.push(
              (ENCOUNTERS_PER_WORLD_SEGMENT / result.seconds) * 3_600,
            );
          }

          const avgKillsPerHour = killsPerHourByClearingWeapon.length === 0
            ? null
            : killsPerHourByClearingWeapon.reduce((sum, value) => sum + value, 0)
              / killsPerHourByClearingWeapon.length;

          depthRows.push({
            tier: `T${String(tier)}`,
            zoneIndex: zoneIndex + 1,
            zone: zone.name,
            segment: segmentIndex + 1,
            clearWeapons: killsPerHourByClearingWeapon.length,
            clearRatePct: round1((killsPerHourByClearingWeapon.length / WEAPON_BY_TIER[tier].length) * 100),
            avgKillsPerHour: avgKillsPerHour === null ? null : round1(avgKillsPerHour),
            minKillsPerHour: killsPerHourByClearingWeapon.length === 0
              ? null
              : round1(Math.min(...killsPerHourByClearingWeapon)),
            maxKillsPerHour: killsPerHourByClearingWeapon.length === 0
              ? null
              : round1(Math.max(...killsPerHourByClearingWeapon)),
            procChanceForTierTargetPct: avgKillsPerHour === null
              ? null
              : round2((targetRunesPerHour / avgKillsPerHour) * 100),
          });
        }
      });
    }

    const tierSummary = ([4, 5, 6, 7, 8] as const).map((tier) => {
      const tierRows = depthRows.filter((row) => row.tier === `T${String(tier)}`);
      const farmableRows = tierRows.filter(
        (row) => row.clearRatePct >= 60 && row.avgKillsPerHour !== null,
      );
      const firstFarmable = farmableRows[0];
      const deepestFarmable = farmableRows[farmableRows.length - 1];
      const targetRunesPerHour = TARGET_WORLD_RUNES_PER_HOUR[tier];
      return {
        tier: `T${String(tier)}`,
        targetRunesPerHour,
        firstFarmable: firstFarmable === undefined
          ? "-"
          : `${firstFarmable.zone} S${String(firstFarmable.segment)}`,
        firstKillsPerHour: firstFarmable?.avgKillsPerHour ?? null,
        firstProcPct: firstFarmable?.procChanceForTierTargetPct ?? null,
        deepestFarmable: deepestFarmable === undefined
          ? "-"
          : `${deepestFarmable.zone} S${String(deepestFarmable.segment)}`,
        deepestKillsPerHour: deepestFarmable?.avgKillsPerHour ?? null,
        deepestProcPct: deepestFarmable?.procChanceForTierTargetPct ?? null,
        mastery0RunesPerHour: round1(targetRunesPerHour),
        mastery25RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(25) / 100)),
        mastery50RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(50) / 100)),
        mastery75RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(75) / 100)),
        mastery100RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(100) / 100)),
      };
    });

    console.log("[FACTION_RUNE_WORLD_DEPTH_ROWS]");
    console.table(depthRows);
    console.log("[FACTION_RUNE_WORLD_TIER_SUMMARY]");
    console.table(tierSummary);

    expect(depthRows.length).toBeGreaterThan(0);
    expect(depthRows.every((row) => row.clearRatePct >= 0 && row.clearRatePct <= 100)).toBe(true);
    expect(tierSummary).toHaveLength(5);
    expect(MASTERY_LEVELS.map(getFactionMasteryYieldBonusPercent)).toEqual([0, 12.5, 25, 37.5, 50]);
  });
});
