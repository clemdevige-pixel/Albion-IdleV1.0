import { resolveWeaponBalanceProfileByMasteryId, type WeaponContentRole, type WeaponGameplayProfile } from "./weaponBalanceProfileCatalog.js";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics.js";
import { resolveUnlockedWeaponAbilities, resolveWeaponMastery } from "./weaponContentCatalog.js";
import {
  buildWeaponOnlyBenchmark,
  buildWeaponPackageBenchmark,
  type BenchmarkLoadoutResolver,
} from "./weaponPackageBenchmark.js";
import type { BenchmarkEnchantment } from "./weaponIdealBenchmark.js";

export interface WeaponRoleBenchmarkRow {
  readonly itemId: string;
  readonly gameplayProfile: WeaponGameplayProfile;
  readonly primaryContentRole: WeaponContentRole;
  readonly secondaryContentRole?: WeaponContentRole | undefined;
  readonly sustainedDps: number;
  readonly opener5Dps: number;
  readonly opener10Dps: number;
  readonly sustainedIndex: number;
  readonly opener5Index: number;
  readonly opener10Index: number;
  readonly packageScore: number;
  readonly hardControlSecondsPer30s: number;
  readonly debuffUptimePercent: number;
  readonly primaryRoleLens: readonly WeaponRoleMetric[];
}

export type WeaponRoleMetric =
  | "sustained"
  | "opener_5s"
  | "opener_10s"
  | "package"
  | "hard_control"
  | "debuff_uptime";

const ROLE_LENSES: Readonly<Record<WeaponContentRole, readonly WeaponRoleMetric[]>> = {
  general_progression: ["package", "sustained", "opener_10s"],
  fame_farm: ["opener_5s", "opener_10s", "sustained"],
  boss: ["sustained", "opener_10s"],
  dungeon: ["package", "hard_control", "debuff_uptime", "opener_10s", "sustained"],
};

const round = (value: number, digits = 1): number => Number(value.toFixed(digits));

function castsInsideWindow(cooldown: number, windowSeconds: number): number {
  const safeCooldown = Math.max(0.5, cooldown);
  return 1 + Math.floor(Math.max(0, windowSeconds - 1e-9) / safeCooldown);
}

function getUtilityDiagnostics(itemId: string, masteryLevel: number): {
  readonly hardControlSecondsPer30s: number;
  readonly debuffUptimePercent: number;
} {
  let hardControlSeconds = 0;
  let debuffSeconds = 0;

  for (const ability of resolveUnlockedWeaponAbilities(itemId, masteryLevel)) {
    const casts = castsInsideWindow(ability.cooldown, 30);
    const mechanics = getWeaponAbilityMechanics(ability.id)?.mechanics ?? [];
    for (const mechanic of mechanics) {
      if (mechanic.kind !== "status") continue;
      if (mechanic.effectType === "stun" || mechanic.effectType === "silence") {
        hardControlSeconds += mechanic.duration * casts;
      } else if (mechanic.effectType === "debuff") {
        debuffSeconds += mechanic.duration * casts;
      }
    }
  }

  return {
    hardControlSecondsPer30s: round(Math.min(30, hardControlSeconds), 2),
    debuffUptimePercent: round((Math.min(30, debuffSeconds) / 30) * 100, 1),
  };
}

/**
 * Role-aware diagnostics only. This function never grants content bonuses and
 * does not create a universal role score. It exposes the existing offensive,
 * package and utility signals together with the authored role so balance
 * reviews can read the relevant metrics for each weapon.
 *
 * Raw opener DPS is intentionally exposed alongside normalized indices. The
 * synthetic median can move when one weapon is tuned, so raw values are the
 * reliable signal for measuring the direct effect of a balance change.
 */
export function buildWeaponRoleBenchmark(
  itemIds: readonly string[],
  masteryLevel: number,
  enchantment: BenchmarkEnchantment,
  resolveLoadout: BenchmarkLoadoutResolver,
): readonly WeaponRoleBenchmarkRow[] {
  const weaponOnly = buildWeaponOnlyBenchmark(itemIds, masteryLevel, enchantment);
  const packages = buildWeaponPackageBenchmark(itemIds, masteryLevel, enchantment, resolveLoadout);
  const packageByItemId = new Map(packages.map((row) => [row.itemId, row] as const));

  return weaponOnly.map((offense) => {
    const mastery = resolveWeaponMastery(offense.itemId);
    if (mastery === undefined) throw new Error(`Weapon has no mastery route: ${offense.itemId}`);
    const profile = resolveWeaponBalanceProfileByMasteryId(String(mastery.weaponId));
    if (profile === undefined) throw new Error(`Weapon has no balance profile: ${offense.itemId}`);
    const packageRow = packageByItemId.get(offense.itemId);
    if (packageRow === undefined) throw new Error(`Weapon has no package benchmark: ${offense.itemId}`);
    const utility = getUtilityDiagnostics(offense.itemId, masteryLevel);

    return {
      itemId: offense.itemId,
      gameplayProfile: profile.gameplayProfile,
      primaryContentRole: profile.primaryContentRole,
      ...(profile.secondaryContentRole === undefined ? {} : { secondaryContentRole: profile.secondaryContentRole }),
      sustainedDps: offense.sustainedDps,
      opener5Dps: offense.opener5,
      opener10Dps: offense.opener10,
      sustainedIndex: offense.offenseIndex,
      opener5Index: offense.opener5Index,
      opener10Index: offense.opener10Index,
      packageScore: packageRow.packageScore,
      hardControlSecondsPer30s: utility.hardControlSecondsPer30s,
      debuffUptimePercent: utility.debuffUptimePercent,
      primaryRoleLens: ROLE_LENSES[profile.primaryContentRole],
    };
  });
}

export function getWeaponRoleLens(role: WeaponContentRole): readonly WeaponRoleMetric[] {
  return ROLE_LENSES[role];
}
