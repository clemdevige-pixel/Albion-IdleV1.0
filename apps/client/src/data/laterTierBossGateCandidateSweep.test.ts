import { describe, expect, it } from "vitest";
import {
  ORANGE_WORLD_COMBAT_CURVE,
  RED_WORLD_COMBAT_CURVE,
  YELLOW_WORLD_COMBAT_CURVE,
  type BossGateCombatProfile,
} from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS_BY_TIER = {
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
} as const;

const ARMOR_BY_TIER = {
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
} as const;

const TIER_CONFIG = [
  {
    tier: 5,
    label: "T5_to_T6",
    mastery: 35,
    zoneDefId: WORLD_ZONE_IDS.ironveil,
    curve: YELLOW_WORLD_COMBAT_CURVE,
    healthMultipliers: [1, 1.05, 1.1, 1.15] as const,
    damageMultipliers: [1.3, 1.325, 1.35, 1.375, 1.4] as const,
    defenseMultipliers: [1, 1.05, 1.1] as const,
  },
  {
    tier: 6,
    label: "T6_to_T7",
    mastery: 45,
    zoneDefId: WORLD_ZONE_IDS.ashenpeak,
    curve: ORANGE_WORLD_COMBAT_CURVE,
    healthMultipliers: [1] as const,
    damageMultipliers: [1.325, 1.35, 1.375, 1.4] as const,
    defenseMultipliers: [1, 1.05] as const,
  },
  {
    tier: 7,
    label: "T7_to_T8",
    mastery: 55,
    zoneDefId: WORLD_ZONE_IDS.doompeak,
    curve: RED_WORLD_COMBAT_CURVE,
    healthMultipliers: [1] as const,
    damageMultipliers: [1.1, 1.125, 1.15, 1.175, 1.2] as const,
    defenseMultipliers: [1, 1.05, 1.1] as const,
  },
] as const;

const T5_DIAGNOSTIC_CANDIDATES = new Set([
  "h1_d1.375_def1",
  "h1_d1.4_def1",
  "h1.05_d1.3_def1.1",
  "h1.15_d1.325_def1.05",
]);

type Tier = keyof typeof WEAPONS_BY_TIER;
type ZoneDefId = (typeof TIER_CONFIG)[number]["zoneDefId"];
type MutableBossGate = {
  progressionRole: "boss_gate";
  healthMultiplier: number;
  damageMultiplier: number;
  defenseMultiplier: number;
};

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function shortWeaponName(itemId: string, tier: Tier): string {
  return itemId.replace("item_weapon_", "").replace(`_t${tier}_`, " ");
}

function run(
  tier: Tier,
  mastery: number,
  zoneDefId: ZoneDefId,
  weaponItemId: string,
  enchantment: 2 | 3,
) {
  return runCombatRuntimeBenchmark({
    label: `boss_gate_t${tier}_${enchantment}_potion`,
    weaponItemId,
    zoneDefId,
    segmentIndex: 9,
    equipmentItemIds: equipmentFor(weaponItemId, tier),
    masteryLevel: mastery,
    enchantment,
    useHealthPotions: true,
  });
}

describe("later-tier boss gate candidate sweep", () => {
  it("refines the T5/T6/T7 boss-gate frontiers with one reusable sweep", () => {
    const allRows: Array<Record<string, number | boolean | string>> = [];
    const t5DiagnosticRows: Array<Record<string, number | boolean | string>> = [];
    let expectedRowCount = 0;

    for (const config of TIER_CONFIG) {
      const tier = config.tier as Tier;
      const finalCurve = config.curve[config.curve.length - 1] as unknown as { bossGate: MutableBossGate };
      const original: BossGateCombatProfile = { ...finalCurve.bossGate };
      const tierRows: Array<Record<string, number | boolean | string>> = [];
      expectedRowCount += config.healthMultipliers.length * config.damageMultipliers.length * config.defenseMultipliers.length;

      try {
        for (const healthMultiplier of config.healthMultipliers) {
          for (const damageMultiplier of config.damageMultipliers) {
            for (const defenseMultiplier of config.defenseMultipliers) {
              finalCurve.bossGate.healthMultiplier = healthMultiplier;
              finalCurve.bossGate.damageMultiplier = damageMultiplier;
              finalCurve.bossGate.defenseMultiplier = defenseMultiplier;

              const candidate = `h${healthMultiplier}_d${damageMultiplier}_def${defenseMultiplier}`;
              const tN2Potion = WEAPONS_BY_TIER[tier].map((weaponItemId) => ({
                weaponItemId,
                result: run(tier, config.mastery, config.zoneDefId, weaponItemId, 2),
              }));
              const tN3Potion = WEAPONS_BY_TIER[tier].map((weaponItemId) => ({
                weaponItemId,
                result: run(tier, config.mastery, config.zoneDefId, weaponItemId, 3),
              }));

              const tN2PotionClear = tN2Potion.filter(({ result }) => result.clear).length;
              const tN3PotionClear = tN3Potion.filter(({ result }) => result.clear).length;
              const validContract = tN2PotionClear === 0 && tN3PotionClear === WEAPONS_BY_TIER[tier].length;
              const adjustmentScore = Number(
                ((healthMultiplier - 1) + (damageMultiplier - 1) + (defenseMultiplier - 1)).toFixed(4),
              );

              tierRows.push({
                transition: config.label,
                candidate,
                healthMultiplier,
                damageMultiplier,
                defenseMultiplier,
                adjustmentScore,
                tN2PotionClear,
                tN3PotionClear,
                tN3PotionMinHp: Math.min(...tN3Potion.map(({ result }) => result.hpPercent)),
                validContract,
              });

              if (tier === 5 && T5_DIAGNOSTIC_CANDIDATES.has(candidate)) {
                for (const enchantment of [2, 3] as const) {
                  const results = enchantment === 2 ? tN2Potion : tN3Potion;
                  for (const { weaponItemId, result } of results) {
                    t5DiagnosticRows.push({
                      candidate,
                      enchantment,
                      weapon: shortWeaponName(weaponItemId, tier),
                      clear: result.clear,
                      hpPercent: result.hpPercent,
                      potions: result.potionsUsed,
                      encounters: result.encounterReached,
                    });
                  }
                }
              }
            }
          }
        }
      } finally {
        finalCurve.bossGate.progressionRole = original.progressionRole;
        finalCurve.bossGate.healthMultiplier = original.healthMultiplier;
        finalCurve.bossGate.damageMultiplier = original.damageMultiplier;
        finalCurve.bossGate.defenseMultiplier = original.defenseMultiplier;
      }

      const valid = tierRows
        .filter((row) => row.validContract === true)
        .sort((a, b) => Number(a.adjustmentScore) - Number(b.adjustmentScore));

      console.log(`[LATER_TIER_BOSS_GATE_${config.label}_CANDIDATE_SWEEP]`);
      console.table(tierRows);
      console.log(`[LATER_TIER_BOSS_GATE_${config.label}_VALID_CANDIDATES]`);
      console.table(valid);
      console.log(
        `[LATER_TIER_BOSS_GATE_${config.label}_VALID_CANDIDATES_JSON]`,
        JSON.stringify(valid, null, 2),
      );

      allRows.push(...tierRows);
    }

    console.log("[T5_BOSS_GATE_WEAPON_OVERLAP_DIAGNOSTIC]");
    console.table(t5DiagnosticRows);
    console.log("[T5_BOSS_GATE_WEAPON_OVERLAP_DIAGNOSTIC_JSON]", JSON.stringify(t5DiagnosticRows, null, 2));

    expect(allRows).toHaveLength(expectedRowCount);
    expect(t5DiagnosticRows).toHaveLength(T5_DIAGNOSTIC_CANDIDATES.size * WEAPONS_BY_TIER[5].length * 2);
  });
});
