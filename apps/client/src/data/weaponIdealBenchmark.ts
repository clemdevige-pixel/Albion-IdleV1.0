import { getEnchantmentStatMultiplier } from "@game/gameplay";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics";
import { getWeaponAttackSpeed } from "./itemPower";
import { resolveEquipmentInfo } from "./itemContentCatalog";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "./weaponContentCatalog";

export const WEAPON_BALANCE_MASTERY_CHECKPOINTS = [1, 10, 30, 50] as const;
export type WeaponBalanceMasteryCheckpoint = (typeof WEAPON_BALANCE_MASTERY_CHECKPOINTS)[number];

export interface WeaponBenchmarkProfile {
  readonly itemId: string;
  readonly masteryLevel: WeaponBalanceMasteryCheckpoint;
  readonly enchantment: 0 | 1 | 2 | 3;
  readonly sustainedDps: number;
  readonly autoAttackDps: number;
  readonly abilityDps: number;
  readonly unlockedAbilityCount: number;
  readonly handling: "one_handed" | "two_handed" | "none";
}

export interface SyntheticIdealWeaponProfile {
  readonly masteryLevel: WeaponBalanceMasteryCheckpoint;
  readonly sustainedDps: number;
  readonly lowerBound: number;
  readonly upperBound: number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function sourceDamageWithMastery(
  itemId: string,
  masteryLevel: number,
  enchantment: 0 | 1 | 2 | 3,
): number {
  const info = resolveEquipmentInfo(itemId);
  const base = info?.stats?.stat_physical_damage ?? info?.stats?.stat_magical_damage ?? 0;
  const enchantmentMultiplier = getEnchantmentStatMultiplier(enchantment);
  // Family mastery grants +0.5 IP/level and specialization +1 IP/level.
  // +100 bonus IP = +20% weapon damage, therefore same-level family + spec
  // contribute +0.3% weapon damage per mastery level.
  const masteryMultiplier = 1 + (masteryLevel * 1.5) / 500;
  return base * enchantmentMultiplier * masteryMultiplier;
}

function directAbilityTotalRatio(abilityId: string, fallbackBonusRatio: number): number {
  const profile = getWeaponAbilityMechanics(abilityId);
  if (profile === undefined) return 1 + fallbackBonusRatio;

  let total = 0;
  for (const mechanic of profile.mechanics) {
    if (mechanic.kind === "damage") {
      // Runtime damage mechanics author `ratio` as bonus damage over one full
      // source-stat hit. `hits` only changes presentation/delivery, never the
      // total offensive budget.
      total += 1 + mechanic.ratio;
      continue;
    }
    if (mechanic.kind === "dot") {
      total += mechanic.ratio * mechanic.ticks;
    }
  }
  return total;
}

function autoCastAvailabilityFactor(itemId: string, abilityId: string, masteryLevel: number): number {
  const profile = getWeaponAbilityMechanics(abilityId);
  const rule = profile?.autoRule;
  if (rule === undefined || rule.kind === "always") return 1;
  if (rule.kind === "target_health_below") return Math.max(0, Math.min(1, rule.ratio));
  if (rule.kind === "target_has_effect") {
    const unlocked = resolveUnlockedWeaponAbilities(itemId, masteryLevel);
    const prerequisiteExists = unlocked.some((ability) => {
      const mechanics = getWeaponAbilityMechanics(ability.id)?.mechanics ?? [];
      return mechanics.some((mechanic) =>
        (mechanic.kind === "status" || mechanic.kind === "dot")
        && mechanic.effectId === rule.effectId,
      );
    });
    return prerequisiteExists ? 1 : 0;
  }
  return 1;
}

export function getWeaponBenchmarkProfile(
  itemId: string,
  masteryLevel: WeaponBalanceMasteryCheckpoint,
  enchantment: 0 | 1 | 2 | 3 = 0,
): WeaponBenchmarkProfile {
  const definition = resolveEquipmentInfo(itemId);
  if (definition === undefined || definition.slot !== "weapon") {
    throw new Error(`Unknown weapon benchmark item: ${itemId}`);
  }
  const route = resolveWeaponMastery(itemId);
  if (route === undefined) throw new Error(`Weapon has no mastery route: ${itemId}`);

  const sourceDamage = sourceDamageWithMastery(itemId, masteryLevel, enchantment);
  const attackSpeed = getWeaponAttackSpeed(itemId) ?? 1;
  const autoAttackDps = sourceDamage * attackSpeed;
  const unlocked = resolveUnlockedWeaponAbilities(itemId, masteryLevel);
  const abilityDps = unlocked.reduce((total, ability) => {
    const availability = autoCastAvailabilityFactor(itemId, ability.id, masteryLevel);
    const totalRatio = directAbilityTotalRatio(ability.id, ability.bonusDamageRatio);
    return total + sourceDamage * totalRatio * availability / Math.max(0.5, ability.cooldown);
  }, 0);

  return {
    itemId,
    masteryLevel,
    enchantment,
    sustainedDps: autoAttackDps + abilityDps,
    autoAttackDps,
    abilityDps,
    unlockedAbilityCount: unlocked.length,
    handling: definition.handling,
  };
}

/**
 * The balance reference is deliberately synthetic: it is the median sustained
 * output of the compared weapon set, never one live weapon. The +/-10% band is
 * the first-pass healthy envelope. Defensive utility (notably 1H + shield),
 * control and encounter-specific value are evaluated separately before a final
 * weapon adjustment is accepted.
 */
export function getSyntheticIdealWeaponProfile(
  profiles: readonly WeaponBenchmarkProfile[],
  masteryLevel: WeaponBalanceMasteryCheckpoint,
): SyntheticIdealWeaponProfile {
  const comparable = profiles.filter((profile) => profile.masteryLevel === masteryLevel);
  const sustainedDps = median(comparable.map((profile) => profile.sustainedDps));
  return {
    masteryLevel,
    sustainedDps,
    lowerBound: sustainedDps * 0.9,
    upperBound: sustainedDps * 1.1,
  };
}
