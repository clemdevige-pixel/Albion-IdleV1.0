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

const FARM_ZONE_BY_TIER = {
  4: WORLD_ZONE_CONTENT.steppe,
  5: WORLD_ZONE_CONTENT.amberwood,
  6: WORLD_ZONE_CONTENT.cinderwood,
  7: WORLD_ZONE_CONTENT.bloodwood,
  8: WORLD_ZONE_CONTENT.blackwood,
} as const satisfies Readonly<Record<Tier, (typeof WORLD_ZONE_CONTENT)[keyof typeof WORLD_ZONE_CONTENT]>>;

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

describe("Faction Rune world-drop calibration benchmark", () => {
  it("derives per-kill proc targets from real farmable world clear speed", () => {
    const rows = (Object.keys(FARM_ZONE_BY_TIER) as unknown as Tier[]).map((tier) => {
      const zone = FARM_ZONE_BY_TIER[tier];
      const profile = TIER_PROFILE[tier];
      const killsPerHourByWeapon = WEAPON_BY_TIER[tier].map((weaponItemId) => {
        const result = runCombatRuntimeBenchmark({
          label: `faction_rune_world_t${String(tier)}_${weaponItemId}`,
          weaponItemId,
          zoneDefId: zone.id,
          segmentIndex: 0,
          equipmentItemIds: equipmentFor(weaponItemId, tier),
          masteryLevel: profile.mastery,
          enchantment: profile.enchantment,
          useHealthPotions: false,
        });
        expect(result.clear).toBe(true);
        return (ENCOUNTERS_PER_WORLD_SEGMENT / result.seconds) * 3_600;
      });

      const avgKillsPerHour = killsPerHourByWeapon.reduce((sum, value) => sum + value, 0)
        / killsPerHourByWeapon.length;
      const targetRunesPerHour = TARGET_WORLD_RUNES_PER_HOUR[tier];
      const baseProcChancePct = (targetRunesPerHour / avgKillsPerHour) * 100;

      return {
        tier: `T${String(tier)}`,
        zone: zone.name,
        targetRunesPerHour,
        avgKillsPerHour: round1(avgKillsPerHour),
        minKillsPerHour: round1(Math.min(...killsPerHourByWeapon)),
        maxKillsPerHour: round1(Math.max(...killsPerHourByWeapon)),
        baseProcChancePct: round2(baseProcChancePct),
        mastery0RunesPerHour: round1(targetRunesPerHour),
        mastery25RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(25) / 100)),
        mastery50RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(50) / 100)),
        mastery75RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(75) / 100)),
        mastery100RunesPerHour: round1(targetRunesPerHour * (1 + getFactionMasteryYieldBonusPercent(100) / 100)),
      };
    });

    console.table(rows);

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.baseProcChancePct > 0 && row.baseProcChancePct < 100)).toBe(true);
    expect(MASTERY_LEVELS.map(getFactionMasteryYieldBonusPercent)).toEqual([0, 12.5, 25, 37.5, 50]);
  });
});
