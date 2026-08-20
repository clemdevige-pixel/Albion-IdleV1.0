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
  { tier: 5, label: "T5_to_T6", mastery: 35, zoneDefId: WORLD_ZONE_IDS.ironveil, curve: YELLOW_WORLD_COMBAT_CURVE },
  { tier: 6, label: "T6_to_T7", mastery: 45, zoneDefId: WORLD_ZONE_IDS.ashenpeak, curve: ORANGE_WORLD_COMBAT_CURVE },
  { tier: 7, label: "T7_to_T8", mastery: 55, zoneDefId: WORLD_ZONE_IDS.doompeak, curve: RED_WORLD_COMBAT_CURVE },
] as const;

// Coarse discovery grid only. Once each tier exposes its first valid frontier,
// refine locally instead of promoting these coarse values directly to live.
const HEALTH_MULTIPLIERS = [1, 1.2, 1.4, 1.6, 1.8] as const;
const DAMAGE_MULTIPLIERS = [1, 1.1, 1.2, 1.3, 1.4, 1.5] as const;
const DEFENSE_MULTIPLIERS = [1, 1.1] as const;

type Tier = keyof typeof WEAPONS_BY_TIER;
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

function run(
  tier: Tier,
  mastery: number,
  zoneDefId: string,
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
  it("discovers the T5/T6/T7 boss-gate frontiers with one reusable sweep", () => {
    const allRows: Array<Record<string, number | boolean | string>> = [];

    for (const config of TIER_CONFIG) {
      const tier = config.tier as Tier;
      const finalCurve = config.curve[config.curve.length - 1] as unknown as { bossGate: MutableBossGate };
      const original: BossGateCombatProfile = { ...finalCurve.bossGate };
      const tierRows: Array<Record<string, number | boolean | string>> = [];

      try {
        for (const healthMultiplier of HEALTH_MULTIPLIERS) {
          for (const damageMultiplier of DAMAGE_MULTIPLIERS) {
            for (const defenseMultiplier of DEFENSE_MULTIPLIERS) {
              finalCurve.bossGate.healthMultiplier = healthMultiplier;
              finalCurve.bossGate.damageMultiplier = damageMultiplier;
              finalCurve.bossGate.defenseMultiplier = defenseMultiplier;

              const tN2Potion = WEAPONS_BY_TIER[tier].map((weaponItemId) =>
                run(tier, config.mastery, config.zoneDefId, weaponItemId, 2),
              );
              const tN3Potion = WEAPONS_BY_TIER[tier].map((weaponItemId) =>
                run(tier, config.mastery, config.zoneDefId, weaponItemId, 3),
              );

              const tN2PotionClear = tN2Potion.filter((result) => result.clear).length;
              const tN3PotionClear = tN3Potion.filter((result) => result.clear).length;
              const validContract = tN2PotionClear === 0 && tN3PotionClear === WEAPONS_BY_TIER[tier].length;
              const adjustmentScore = Number(
                ((healthMultiplier - 1) + (damageMultiplier - 1) + (defenseMultiplier - 1)).toFixed(4),
              );

              tierRows.push({
                transition: config.label,
                candidate: `h${healthMultiplier}_d${damageMultiplier}_def${defenseMultiplier}`,
                healthMultiplier,
                damageMultiplier,
                defenseMultiplier,
                adjustmentScore,
                tN2PotionClear,
                tN3PotionClear,
                tN3PotionMinHp: Math.min(...tN3Potion.map((result) => result.hpPercent)),
                validContract,
              });
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

    console.log("[LATER_TIER_BOSS_GATE_ALL_CANDIDATES_JSON]", JSON.stringify(allRows, null, 2));

    expect(allRows).toHaveLength(
      TIER_CONFIG.length * HEALTH_MULTIPLIERS.length * DAMAGE_MULTIPLIERS.length * DEFENSE_MULTIPLIERS.length,
    );
  });
});
