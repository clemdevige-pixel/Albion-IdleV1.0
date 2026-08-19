import { afterEach, describe, expect, it } from "vitest";
import { BLUE_WORLD_COMBAT_CURVE } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

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
const FROSTPEAK_INDEX = 4;

type MutableCurve = {
  healthStart: number;
  healthEnd: number;
  damageStart: number;
  damageEnd: number;
  defenseStart: number;
  defenseEnd: number;
  defenseModel: "legacy_flat_magic" | "rank_parity";
};

const liveCurve = BLUE_WORLD_COMBAT_CURVE[FROSTPEAK_INDEX];
if (liveCurve === undefined) throw new Error("Missing Frostpeak curve");
const original = { ...liveCurve };

const CANDIDATES = [
  { id: "live", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.8 },
  { id: "health_3_95", healthEnd: 3.95, damageEnd: 2.8, defenseEnd: 1.8 },
  { id: "health_3_90", healthEnd: 3.9, damageEnd: 2.8, defenseEnd: 1.8 },
  { id: "damage_2_75", healthEnd: 4.0, damageEnd: 2.75, defenseEnd: 1.8 },
  { id: "damage_2_70", healthEnd: 4.0, damageEnd: 2.7, defenseEnd: 1.8 },
  { id: "defense_1_75", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.75 },
  { id: "defense_1_70", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.7 },
  { id: "balanced_small", healthEnd: 3.95, damageEnd: 2.75, defenseEnd: 1.75 },
] as const;

function mutableFrostpeak(): MutableCurve {
  return BLUE_WORLD_COMBAT_CURVE[FROSTPEAK_INDEX] as unknown as MutableCurve;
}

function applyCandidate(candidate: (typeof CANDIDATES)[number]): void {
  const curve = mutableFrostpeak();
  curve.healthEnd = candidate.healthEnd;
  curve.damageEnd = candidate.damageEnd;
  curve.defenseEnd = candidate.defenseEnd;
}

function restore(): void {
  Object.assign(mutableFrostpeak(), original);
}

afterEach(restore);

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function run(weaponItemId: string, enchantment: 2 | 3, masteryLevel: number, useHealthPotions: boolean, segmentIndex: number) {
  return runCombatRuntimeBenchmark({
    label: `frostpeak_candidate_${shortName(weaponItemId)}_${enchantment}_${segmentIndex + 1}`,
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel,
    enchantment,
    useHealthPotions,
  });
}

describe("Frostpeak S10 endpoint candidate sweep", () => {
  it("finds the smallest endpoint adjustment that restores the authored T4.3 wall contract", () => {
    const rows = CANDIDATES.map((candidate) => {
      applyCandidate(candidate);

      const t42S10 = WEAPONS.map((weapon) => run(weapon, 2, 22, false, 9));
      const t42PotionS10 = WEAPONS.map((weapon) => run(weapon, 2, 22, true, 9));
      const t43S9 = WEAPONS.map((weapon) => run(weapon, 3, 22, false, 8));
      const t43S10 = WEAPONS.map((weapon) => run(weapon, 3, 22, false, 9));

      const row = {
        candidate: candidate.id,
        healthEnd: candidate.healthEnd,
        damageEnd: candidate.damageEnd,
        defenseEnd: candidate.defenseEnd,
        t42S10Clear: t42S10.filter((result) => result.clear).length,
        t42PotionS10Clear: t42PotionS10.filter((result) => result.clear).length,
        t43S9Clear: t43S9.filter((result) => result.clear).length,
        t43S10Clear: t43S10.filter((result) => result.clear).length,
        t43S10MinHp: Number(Math.min(...t43S10.filter((result) => result.clear).map((result) => result.hpPercent), 100).toFixed(1)),
        t43S10AvgHp: Number((t43S10.reduce((sum, result) => sum + result.hpPercent, 0) / t43S10.length).toFixed(1)),
        validContract:
          t42S10.filter((result) => result.clear).length < WEAPONS.length &&
          t42PotionS10.every((result) => result.clear) &&
          t43S9.every((result) => result.clear) &&
          t43S10.every((result) => result.clear),
      };

      restore();
      return row;
    });

    console.log("[FROSTPEAK_S10_ENDPOINT_CANDIDATE_SWEEP]");
    console.table(rows);
    console.log("[FROSTPEAK_S10_ENDPOINT_CANDIDATE_SWEEP_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CANDIDATES.length);
  });
});
