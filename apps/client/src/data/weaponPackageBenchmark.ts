import {
  getSyntheticIdealCombatProfile,
  getSyntheticIdealWeaponProfile,
  getWeaponBenchmarkProfile,
  getWeaponCombatBenchmarkProfile,
  type BenchmarkDefensiveLoadout,
  type BenchmarkEnchantment,
} from "./weaponIdealBenchmark.js";

export interface WeaponOnlyBenchmarkRow {
  readonly itemId: string;
  readonly handling: "one_handed" | "two_handed" | "none";
  readonly sustainedDps: number;
  readonly opener5: number;
  readonly opener10: number;
  readonly offenseIndex: number;
  readonly opener5Index: number;
  readonly opener10Index: number;
}

export interface WeaponPackageBenchmarkRow {
  readonly itemId: string;
  readonly handling: "one_handed" | "two_handed" | "none";
  readonly offenseIndex: number;
  readonly averageEffectiveHealth: number;
  readonly defenseIndex: number;
  readonly packageScore: number;
  readonly offHandItemId?: string | undefined;
}

export type BenchmarkLoadoutResolver = (itemId: string) => BenchmarkDefensiveLoadout;

const round = (value: number, digits = 1): number => Number(value.toFixed(digits));

/**
 * Intrinsic offensive comparison. No armor/off-hand is involved.
 * Use this when comparing weapon families or deciding whether an off-hand is
 * masking an offensive deficit.
 */
export function buildWeaponOnlyBenchmark(
  itemIds: readonly string[],
  masteryLevel: number,
  enchantment: BenchmarkEnchantment,
): readonly WeaponOnlyBenchmarkRow[] {
  const profiles = itemIds.map((itemId) => getWeaponBenchmarkProfile(itemId, masteryLevel, enchantment));
  const ideal = getSyntheticIdealWeaponProfile(profiles, masteryLevel);
  return profiles.map((profile) => ({
    itemId: profile.itemId,
    handling: profile.handling,
    sustainedDps: round(profile.sustainedDps, 2),
    opener5: round(profile.openerDps5s, 2),
    opener10: round(profile.openerDps10s, 2),
    offenseIndex: round((profile.sustainedDps / ideal.sustainedDps) * 100),
    opener5Index: round((profile.openerDps5s / ideal.openerDps5s) * 100),
    opener10Index: round((profile.openerDps10s / ideal.openerDps10s) * 100),
  }));
}

/**
 * Build/package comparison using an explicit loadout resolver. This is the
 * reusable entry point for future tiers and off-hands: the weapon never
 * implicitly owns the power of an off-hand.
 */
export function buildWeaponPackageBenchmark(
  itemIds: readonly string[],
  masteryLevel: number,
  enchantment: BenchmarkEnchantment,
  resolveLoadout: BenchmarkLoadoutResolver,
): readonly WeaponPackageBenchmarkRow[] {
  const profiles = itemIds.map((itemId) => getWeaponCombatBenchmarkProfile(
    itemId,
    masteryLevel,
    enchantment,
    resolveLoadout(itemId),
  ));
  const ideal = getSyntheticIdealCombatProfile(profiles, masteryLevel);
  return profiles.map((profile) => {
    const offenseIndex = (profile.offense.sustainedDps / ideal.sustainedDps) * 100;
    const defenseIndex = (profile.defense.averageEffectiveHealth / ideal.averageEffectiveHealth) * 100;
    return {
      itemId: profile.offense.itemId,
      handling: profile.offense.handling,
      offenseIndex: round(offenseIndex),
      averageEffectiveHealth: round(profile.defense.averageEffectiveHealth),
      defenseIndex: round(defenseIndex),
      packageScore: round((offenseIndex + defenseIndex) / 2),
      ...(profile.defense.offHandItemId === undefined ? {} : { offHandItemId: profile.defense.offHandItemId }),
    };
  });
}
