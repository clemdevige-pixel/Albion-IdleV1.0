import { describe, expect, it } from "vitest";
import {
  buildCandidateWeaponOnlyBenchmark,
  buildCandidateWeaponPackageBenchmark,
} from "./candidateWeaponBalanceBenchmark.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { T4_DEFENSIVE_LOADOUT, T4_SHIELD, type BenchmarkEnchantment } from "./weaponIdealBenchmark.js";
import { buildWeaponOnlyBenchmark, buildWeaponPackageBenchmark } from "./weaponPackageBenchmark.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function referenceLoadout(itemId: string) {
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds: T4_DEFENSIVE_LOADOUT, offHandItemId: T4_SHIELD }
    : { armorItemIds: T4_DEFENSIVE_LOADOUT };
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function printCheckpoint(label: string, masteryLevel: number, enchantment: BenchmarkEnchantment) {
  const baselineWeapon = buildWeaponOnlyBenchmark(T4_WEAPONS, masteryLevel, enchantment);
  const candidateWeapon = buildCandidateWeaponOnlyBenchmark(T4_WEAPONS, masteryLevel, enchantment);
  const baselinePackage = buildWeaponPackageBenchmark(T4_WEAPONS, masteryLevel, enchantment, referenceLoadout);
  const candidatePackage = buildCandidateWeaponPackageBenchmark(T4_WEAPONS, masteryLevel, enchantment, referenceLoadout);

  const weaponComparison = baselineWeapon.map((baseline) => {
    const candidate = candidateWeapon.find((row) => row.itemId === baseline.itemId);
    if (candidate === undefined) throw new Error(`Missing candidate weapon score for ${baseline.itemId}`);
    return {
      checkpoint: label,
      weapon: shortName(baseline.itemId),
      liveDps: baseline.sustainedDps,
      candidateDps: candidate.sustainedDps,
      dpsDeltaPct: round1(((candidate.sustainedDps / baseline.sustainedDps) - 1) * 100),
      liveOffense: baseline.offenseIndex,
      candidateOffense: candidate.offenseIndex,
      liveOpener5: baseline.opener5Index,
      candidateOpener5: candidate.opener5Index,
      liveOpener10: baseline.opener10Index,
      candidateOpener10: candidate.opener10Index,
    };
  });

  const packageComparison = baselinePackage.map((baseline) => {
    const candidate = candidatePackage.find((row) => row.itemId === baseline.itemId);
    if (candidate === undefined) throw new Error(`Missing candidate package score for ${baseline.itemId}`);
    return {
      checkpoint: label,
      weapon: shortName(baseline.itemId),
      liveOffense: baseline.offenseIndex,
      candidateOffense: candidate.offenseIndex,
      defense: baseline.defenseIndex,
      livePackage: baseline.packageScore,
      candidatePackage: candidate.packageScore,
      packageDelta: round1(candidate.packageScore - baseline.packageScore),
    };
  });

  console.table(weaponComparison);
  console.table(packageComparison);
  return { baselineWeapon, candidateWeapon, baselinePackage, candidatePackage };
}

describe("candidate weapon offensive/defensive package scoring", () => {
  it("compares live scoring against benchmark-only candidate weapon tuning", () => {
    const t41 = printCheckpoint("T4_1_M18", 18, 1);
    const t42 = printCheckpoint("T4_2_M22", 22, 2);

    for (const result of [t41, t42]) {
      expect(result.baselineWeapon).toHaveLength(5);
      expect(result.candidateWeapon).toHaveLength(5);
      expect(result.baselinePackage).toHaveLength(5);
      expect(result.candidatePackage).toHaveLength(5);
      expect(result.candidatePackage.every((row) => Number.isFinite(row.packageScore))).toBe(true);
    }
  });
});
