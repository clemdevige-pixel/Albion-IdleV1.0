import { describe, expect, it } from "vitest";
import {
  T4_DEFENSIVE_LOADOUT,
  getSyntheticIdealCombatProfile,
  getSyntheticIdealWeaponProfile,
  getWeaponBenchmarkProfile,
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

function buildWeaponOnlyRows(masteryLevel: number, enchantment: BenchmarkEnchantment) {
  const profiles = T4_WEAPONS.map((itemId) => getWeaponBenchmarkProfile(itemId, masteryLevel, enchantment));
  const ideal = getSyntheticIdealWeaponProfile(profiles, masteryLevel);

  return profiles.map((profile) => ({
    weapon: shortName(profile.itemId),
    handling: profile.handling,
    sustainedDps: Number(profile.sustainedDps.toFixed(2)),
    opener5: Number(profile.openerDps5s.toFixed(2)),
    opener10: Number(profile.openerDps10s.toFixed(2)),
    offenseIndex: Number(((profile.sustainedDps / ideal.sustainedDps) * 100).toFixed(1)),
    opener5Index: Number(((profile.openerDps5s / ideal.openerDps5s) * 100).toFixed(1)),
    opener10Index: Number(((profile.openerDps10s / ideal.openerDps10s) * 100).toFixed(1)),
  }));
}

function buildLoadoutRows(masteryLevel: number, enchantment: BenchmarkEnchantment) {
  const profiles = T4_WEAPONS.map((itemId) => getWeaponCombatBenchmarkProfile(itemId, masteryLevel, enchantment));
  const ideal = getSyntheticIdealCombatProfile(profiles, masteryLevel);

  return profiles.map((profile) => {
    const offenseIndex = (profile.offense.sustainedDps / ideal.sustainedDps) * 100;
    const defenseIndex = (profile.defense.averageEffectiveHealth / ideal.averageEffectiveHealth) * 100;
    return {
      weapon: shortName(profile.offense.itemId),
      handling: profile.offense.handling,
      offenseIndex: Number(offenseIndex.toFixed(1)),
      avgEhp: Number(profile.defense.averageEffectiveHealth.toFixed(1)),
      defenseIndex: Number(defenseIndex.toFixed(1)),
      loadoutScore: Number(((offenseIndex + defenseIndex) / 2).toFixed(1)),
      offHand: profile.defense.offHandItemId ?? "-",
    };
  });
}

function buildNeutralArmorRows(masteryLevel: number, enchantment: BenchmarkEnchantment) {
  // Same armor for every weapon and deliberately no off-hand: this exposes the
  // weapon's offensive identity without attributing shield power to Broadsword.
  const profiles = T4_WEAPONS.map((itemId) => getWeaponCombatBenchmarkProfile(itemId, masteryLevel, enchantment, {
    armorItemIds: T4_DEFENSIVE_LOADOUT,
  }));
  const ideal = getSyntheticIdealCombatProfile(profiles, masteryLevel);

  return profiles.map((profile) => {
    const offenseIndex = (profile.offense.sustainedDps / ideal.sustainedDps) * 100;
    const defenseIndex = (profile.defense.averageEffectiveHealth / ideal.averageEffectiveHealth) * 100;
    return {
      weapon: shortName(profile.offense.itemId),
      offenseIndex: Number(offenseIndex.toFixed(1)),
      defenseIndex: Number(defenseIndex.toFixed(1)),
      neutralPackageScore: Number(((offenseIndex + defenseIndex) / 2).toFixed(1)),
    };
  });
}

function printCheckpoint(label: string, masteryLevel: number, enchantment: BenchmarkEnchantment) {
  const weaponOnly = buildWeaponOnlyRows(masteryLevel, enchantment);
  const neutral = buildNeutralArmorRows(masteryLevel, enchantment);
  const loadout = buildLoadoutRows(masteryLevel, enchantment);
  console.log(`[WEAPON_ONLY_SCORE_${label}]`);
  console.table(weaponOnly);
  console.log(`[WEAPON_NEUTRAL_PACKAGE_${label}]`);
  console.table(neutral);
  console.log(`[WEAPON_LOADOUT_SCORE_${label}]`);
  console.table(loadout);
  return { weaponOnly, neutral, loadout };
}

describe("weapon offensive/defensive package scoring", () => {
  it("separates weapon-only identity from weapon plus off-hand loadout power", () => {
    const t41 = printCheckpoint("T4_1_M18", 18, 1);
    const t42 = printCheckpoint("T4_2_M22", 22, 2);

    for (const result of [t41, t42]) {
      expect(result.weaponOnly).toHaveLength(5);
      expect(result.neutral).toHaveLength(5);
      expect(result.loadout).toHaveLength(5);
      expect(result.neutral.every((row) => row.defenseIndex === 100)).toBe(true);
      expect(result.loadout.every((row) => Number.isFinite(row.loadoutScore))).toBe(true);
    }
  });
});
