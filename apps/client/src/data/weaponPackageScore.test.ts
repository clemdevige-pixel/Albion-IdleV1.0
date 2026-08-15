import { describe, expect, it } from "vitest";
import {
  getSyntheticIdealCombatProfile,
  getWeaponCombatBenchmarkProfile,
  type BenchmarkEnchantment,
} from "./weaponIdealBenchmark";

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

function buildScoreRows(masteryLevel: number, enchantment: BenchmarkEnchantment) {
  const profiles = T4_WEAPONS.map((itemId) => getWeaponCombatBenchmarkProfile(itemId, masteryLevel, enchantment));
  const ideal = getSyntheticIdealCombatProfile(profiles, masteryLevel);

  return profiles.map((profile) => {
    const sustainedIndex = (profile.offense.sustainedDps / ideal.sustainedDps) * 100;
    const opener5Index = (profile.offense.openerDps5s / ideal.openerDps5s) * 100;
    const opener10Index = (profile.offense.openerDps10s / ideal.openerDps10s) * 100;
    const defenseIndex = (profile.defense.averageEffectiveHealth / ideal.averageEffectiveHealth) * 100;
    // Diagnostic package score: offense and survivability have equal weight.
    // We keep opener indices visible separately rather than hiding burst differences inside the score.
    const packageScore = (sustainedIndex + defenseIndex) / 2;

    return {
      weapon: shortName(profile.offense.itemId),
      handling: profile.offense.handling,
      sustainedDps: Number(profile.offense.sustainedDps.toFixed(2)),
      opener5: Number(profile.offense.openerDps5s.toFixed(2)),
      opener10: Number(profile.offense.openerDps10s.toFixed(2)),
      avgEhp: Number(profile.defense.averageEffectiveHealth.toFixed(1)),
      offenseIndex: Number(sustainedIndex.toFixed(1)),
      opener5Index: Number(opener5Index.toFixed(1)),
      opener10Index: Number(opener10Index.toFixed(1)),
      defenseIndex: Number(defenseIndex.toFixed(1)),
      packageScore: Number(packageScore.toFixed(1)),
      offHand: profile.defense.offHandItemId ?? "-",
    };
  });
}

describe("weapon offensive/defensive package scoring", () => {
  it("prints the live-baseline T4.1 and T4.2 package scores", () => {
    const t41 = buildScoreRows(18, 1);
    const t42 = buildScoreRows(22, 2);

    console.log("[WEAPON_PACKAGE_SCORE_T4_1_M18]");
    console.table(t41);
    console.log("[WEAPON_PACKAGE_SCORE_T4_2_M22]");
    console.table(t42);

    expect(t41).toHaveLength(5);
    expect(t42).toHaveLength(5);
    expect([...t41, ...t42].every((row) => Number.isFinite(row.packageScore))).toBe(true);
  });
});
