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

type Candidate = {
  readonly id: string;
  readonly healthEnd: number;
  readonly damageEnd: number;
  readonly defenseEnd: number;
};

const liveCurve = BLUE_WORLD_COMBAT_CURVE[FROSTPEAK_INDEX];
if (liveCurve === undefined) throw new Error("Missing Frostpeak curve");
const original = { ...liveCurve };

const CANDIDATES: readonly Candidate[] = [
  { id: "live", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.8 },

  { id: "health_3_90", healthEnd: 3.9, damageEnd: 2.8, defenseEnd: 1.8 },
  { id: "health_3_80", healthEnd: 3.8, damageEnd: 2.8, defenseEnd: 1.8 },
  { id: "health_3_70", healthEnd: 3.7, damageEnd: 2.8, defenseEnd: 1.8 },

  { id: "damage_2_70", healthEnd: 4.0, damageEnd: 2.7, defenseEnd: 1.8 },
  { id: "damage_2_60", healthEnd: 4.0, damageEnd: 2.6, defenseEnd: 1.8 },
  { id: "damage_2_50", healthEnd: 4.0, damageEnd: 2.5, defenseEnd: 1.8 },

  { id: "defense_1_70", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.7 },
  { id: "defense_1_60", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.6 },
  { id: "defense_1_50", healthEnd: 4.0, damageEnd: 2.8, defenseEnd: 1.5 },

  { id: "balanced_3_90_2_70_1_70", healthEnd: 3.9, damageEnd: 2.7, defenseEnd: 1.7 },
  { id: "balanced_3_85_2_65_1_65", healthEnd: 3.85, damageEnd: 2.65, defenseEnd: 1.65 },
  { id: "balanced_3_80_2_60_1_60", healthEnd: 3.8, damageEnd: 2.6, defenseEnd: 1.6 },
  { id: "balanced_3_75_2_55_1_55", healthEnd: 3.75, damageEnd: 2.55, defenseEnd: 1.55 },
  { id: "balanced_3_70_2_50_1_50", healthEnd: 3.7, damageEnd: 2.5, defenseEnd: 1.5 },
] as const;

function mutableFrostpeak(): MutableCurve {
  return BLUE_WORLD_COMBAT_CURVE[FROSTPEAK_INDEX] as unknown as MutableCurve;
}

function applyCandidate(candidate: Candidate): void {
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

function adjustmentScore(candidate: Candidate): number {
  const healthReduction = (original.healthEnd - candidate.healthEnd) / original.healthEnd;
  const damageReduction = (original.damageEnd - candidate.damageEnd) / original.damageEnd;
  const defenseReduction = (original.defenseEnd - candidate.defenseEnd) / original.defenseEnd;
  return Number((healthReduction + damageReduction + defenseReduction).toFixed(4));
}

describe("Frostpeak S10 endpoint candidate sweep", () => {
  it("finds the smallest endpoint adjustment that restores the authored T4.3 wall contract", () => {
    const rows = CANDIDATES.map((candidate) => {
      applyCandidate(candidate);

      const t42S10 = WEAPONS.map((weapon) => run(weapon, 2, 22, false, 9));
      const t42PotionS10 = WEAPONS.map((weapon) => run(weapon, 2, 22, true, 9));
      const t43S9 = WEAPONS.map((weapon) => run(weapon, 3, 22, false, 8));
      const t43S10 = WEAPONS.map((weapon) => run(weapon, 3, 22, false, 9));

      const validContract =
        t42S10.filter((result) => result.clear).length < WEAPONS.length &&
        t42PotionS10.every((result) => result.clear) &&
        t43S9.every((result) => result.clear) &&
        t43S10.every((result) => result.clear);

      const row = {
        candidate: candidate.id,
        healthEnd: candidate.healthEnd,
        damageEnd: candidate.damageEnd,
        defenseEnd: candidate.defenseEnd,
        adjustmentScore: adjustmentScore(candidate),
        t42S10Clear: t42S10.filter((result) => result.clear).length,
        t42PotionS10Clear: t42PotionS10.filter((result) => result.clear).length,
        t43S9Clear: t43S9.filter((result) => result.clear).length,
        t43S10Clear: t43S10.filter((result) => result.clear).length,
        t43S10MinHp: Number(Math.min(...t43S10.filter((result) => result.clear).map((result) => result.hpPercent), 100).toFixed(1)),
        t43S10AvgHp: Number((t43S10.reduce((sum, result) => sum + result.hpPercent, 0) / t43S10.length).toFixed(1)),
        validContract,
      };

      restore();
      return row;
    });

    const validCandidates = rows
      .filter((row) => row.validContract)
      .sort((a, b) => a.adjustmentScore - b.adjustmentScore || a.t43S10AvgHp - b.t43S10AvgHp);

    console.log("[FROSTPEAK_S10_ENDPOINT_CANDIDATE_SWEEP]");
    console.table(rows);
    console.log("[FROSTPEAK_S10_ENDPOINT_VALID_CANDIDATES]");
    console.table(validCandidates);
    console.log("[FROSTPEAK_S10_ENDPOINT_CANDIDATE_SWEEP_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CANDIDATES.length);
  });
});
