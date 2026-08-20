import { describe, expect, it } from "vitest";
import { BLUE_WORLD_COMBAT_CURVE, type BossGateCombatProfile } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

const HEALTH_MULTIPLIERS = [1.05, 1.1, 1.15, 1.2, 1.25, 1.3] as const;
const DAMAGE_MULTIPLIERS = [1, 1.05, 1.1, 1.15] as const;
const DEFENSE_MULTIPLIERS = [1, 1.05, 1.1] as const;

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function run(weaponItemId: string, enchantment: 2 | 3, useHealthPotions: boolean) {
  return runCombatRuntimeBenchmark({
    label: `frostpeak_boss_gate_t4_${enchantment}_${useHealthPotions ? "potion" : "no_potion"}`,
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel: 22,
    enchantment,
    useHealthPotions,
  });
}

type MutableBossGate = {
  progressionRole: "boss_gate";
  healthMultiplier: number;
  damageMultiplier: number;
  defenseMultiplier: number;
};

describe("Frostpeak boss gate candidate sweep", () => {
  it("finds the smallest boss-only pressure compatible with the T4.3 gate contract", () => {
    const frostpeak = BLUE_WORLD_COMBAT_CURVE[4] as unknown as { bossGate: MutableBossGate };
    const original: BossGateCombatProfile = { ...frostpeak.bossGate };
    const rows: Array<Record<string, number | boolean | string>> = [];

    try {
      for (const healthMultiplier of HEALTH_MULTIPLIERS) {
        for (const damageMultiplier of DAMAGE_MULTIPLIERS) {
          for (const defenseMultiplier of DEFENSE_MULTIPLIERS) {
            frostpeak.bossGate.healthMultiplier = healthMultiplier;
            frostpeak.bossGate.damageMultiplier = damageMultiplier;
            frostpeak.bossGate.defenseMultiplier = defenseMultiplier;

            const t42Potion = T4_WEAPONS.map((weaponItemId) => run(weaponItemId, 2, true));
            const t43NoPotion = T4_WEAPONS.map((weaponItemId) => run(weaponItemId, 3, false));
            const t43Potion = T4_WEAPONS.map((weaponItemId) => run(weaponItemId, 3, true));

            const t42PotionClear = t42Potion.filter((result) => result.clear).length;
            const t43NoPotionClear = t43NoPotion.filter((result) => result.clear).length;
            const t43PotionClear = t43Potion.filter((result) => result.clear).length;
            const validContract = t42PotionClear === 0 && t43PotionClear === T4_WEAPONS.length;
            const adjustmentScore = Number(
              ((healthMultiplier - 1) + (damageMultiplier - 1) + (defenseMultiplier - 1)).toFixed(4),
            );

            rows.push({
              candidate: `h${healthMultiplier}_d${damageMultiplier}_def${defenseMultiplier}`,
              healthMultiplier,
              damageMultiplier,
              defenseMultiplier,
              adjustmentScore,
              t42PotionClear,
              t43NoPotionClear,
              t43PotionClear,
              t43NoPotionMinHp: Math.min(...t43NoPotion.map((result) => result.hpPercent)),
              t43PotionMinHp: Math.min(...t43Potion.map((result) => result.hpPercent)),
              validContract,
            });
          }
        }
      }
    } finally {
      frostpeak.bossGate.progressionRole = original.progressionRole;
      frostpeak.bossGate.healthMultiplier = original.healthMultiplier;
      frostpeak.bossGate.damageMultiplier = original.damageMultiplier;
      frostpeak.bossGate.defenseMultiplier = original.defenseMultiplier;
    }

    const valid = rows
      .filter((row) => row.validContract === true)
      .sort((a, b) => Number(a.adjustmentScore) - Number(b.adjustmentScore));

    console.log("[FROSTPEAK_BOSS_GATE_CANDIDATE_SWEEP]");
    console.table(rows);
    console.log("[FROSTPEAK_BOSS_GATE_VALID_CANDIDATES]");
    console.table(valid);
    console.log("[FROSTPEAK_BOSS_GATE_VALID_CANDIDATES_JSON]", JSON.stringify(valid, null, 2));

    expect(rows).toHaveLength(
      HEALTH_MULTIPLIERS.length * DAMAGE_MULTIPLIERS.length * DEFENSE_MULTIPLIERS.length,
    );
  });
});
