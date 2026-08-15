import { getEnchantmentStatMultiplier } from "@game/gameplay";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics";
import { getItemTier, getWeaponAttackSpeed } from "./itemPower";
import { resolveEquipmentInfo } from "./itemContentCatalog";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "./weaponContentCatalog";

export const WEAPON_BALANCE_MASTERY_CHECKPOINTS = [1, 10, 30, 50] as const;
export type WeaponBalanceMasteryCheckpoint = (typeof WEAPON_BALANCE_MASTERY_CHECKPOINTS)[number];
export type BenchmarkEnchantment = 0 | 1 | 2 | 3;

export interface WeaponBenchmarkProfile {
  readonly itemId: string;
  readonly masteryLevel: number;
  readonly enchantment: BenchmarkEnchantment;
  readonly sustainedDps: number;
  readonly autoAttackDps: number;
  readonly abilityDps: number;
  readonly unlockedAbilityCount: number;
  readonly handling: "one_handed" | "two_handed" | "none";
}

export interface WeaponDefensiveBenchmarkProfile {
  readonly itemId: string;
  readonly enchantment: BenchmarkEnchantment;
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly physicalEffectiveHealth: number;
  readonly magicalEffectiveHealth: number;
  readonly averageEffectiveHealth: number;
  readonly offHandItemId?: string | undefined;
}

export interface WeaponCombatBenchmarkProfile {
  readonly offense: WeaponBenchmarkProfile;
  readonly defense: WeaponDefensiveBenchmarkProfile;
}

export interface SyntheticIdealWeaponProfile {
  readonly masteryLevel: number;
  readonly sustainedDps: number;
  readonly lowerBound: number;
  readonly upperBound: number;
}

export interface SyntheticIdealCombatProfile extends SyntheticIdealWeaponProfile {
  readonly physicalEffectiveHealth: number;
  readonly magicalEffectiveHealth: number;
  readonly averageEffectiveHealth: number;
}

const BASE_HERO_MAX_HEALTH = 100;
const T3_DEFENSIVE_LOADOUT = [
  "item_iron_helmet",
  "item_leather_armor",
  "item_leather_boots",
  "item_traveler_cape",
] as const;
const T4_DEFENSIVE_LOADOUT = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  // No authored T4 cape exists yet; the current progression keeps the T3 cape.
  "item_traveler_cape",
] as const;
const T3_SHIELD = "item_shield_t3_reinforced";
const T4_SHIELD = "item_shield_t4_reinforced";

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
  enchantment: BenchmarkEnchantment,
): number {
  const info = resolveEquipmentInfo(itemId);
  const base = info?.stats?.stat_physical_damage ?? info?.stats?.stat_magical_damage ?? 0;
  const enchantmentMultiplier = getEnchantmentStatMultiplier(enchantment);
  // Same-level family + specialization = 1.5 bonus IP / mastery level.
  // +100 bonus IP = +20% weapon damage => +0.3% damage / mastery level.
  const masteryMultiplier = 1 + (masteryLevel * 1.5) / 500;
  return base * enchantmentMultiplier * masteryMultiplier;
}

function hasUnlockedEffect(itemId: string, masteryLevel: number, effectId: string): boolean {
  return resolveUnlockedWeaponAbilities(itemId, masteryLevel).some((ability) => {
    const mechanics = getWeaponAbilityMechanics(ability.id)?.mechanics ?? [];
    return mechanics.some((mechanic) =>
      (mechanic.kind === "status" || mechanic.kind === "dot")
      && mechanic.effectId === effectId,
    );
  });
}

function abilityTotalRatio(
  itemId: string,
  abilityId: string,
  masteryLevel: number,
  fallbackBonusRatio: number,
): number {
  const profile = getWeaponAbilityMechanics(abilityId);
  if (profile === undefined) return 1 + fallbackBonusRatio;

  let total = 0;
  for (const mechanic of profile.mechanics) {
    if (mechanic.kind === "damage") {
      let ratio = 1 + mechanic.ratio;
      if (mechanic.bonusHealthBelow !== undefined) {
        ratio += mechanic.bonusHealthBelow.bonusRatio;
      }
      if (
        mechanic.bonusEffect !== undefined
        && hasUnlockedEffect(itemId, masteryLevel, mechanic.bonusEffect.effectId)
      ) {
        ratio += mechanic.bonusEffect.bonusRatio;
      }
      total += ratio;
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
    return hasUnlockedEffect(itemId, masteryLevel, rule.effectId) ? 1 : 0;
  }
  return 1;
}

function defensiveLoadoutForWeapon(itemId: string): {
  readonly armorItemIds: readonly string[];
  readonly offHandItemId?: string | undefined;
} {
  const definition = resolveEquipmentInfo(itemId);
  const tier = getItemTier(itemId);
  if (definition === undefined || definition.slot !== "weapon" || (tier !== 3 && tier !== 4)) {
    throw new Error(`Defensive benchmark is authored for T3/T4 weapons only: ${itemId}`);
  }
  const armorItemIds = tier === 3 ? T3_DEFENSIVE_LOADOUT : T4_DEFENSIVE_LOADOUT;
  if (definition.handling !== "one_handed") return { armorItemIds };
  return {
    armorItemIds,
    offHandItemId: tier === 3 ? T3_SHIELD : T4_SHIELD,
  };
}

function effectiveEquipmentStat(
  itemId: string,
  statId: "stat_max_health" | "stat_armor" | "stat_magic_resistance",
  enchantment: BenchmarkEnchantment,
): number {
  const info = resolveEquipmentInfo(itemId);
  const value = info?.stats?.[statId] ?? 0;
  const tier = getItemTier(itemId);
  // T3 cannot be enchanted. This also keeps the current T3 cape untouched when
  // it is part of a T4 loadout.
  const multiplier = tier !== undefined && tier >= 4
    ? getEnchantmentStatMultiplier(enchantment)
    : 1;
  return value * multiplier;
}

function effectiveHealth(maxHealth: number, resistance: number): number {
  const safeResistance = Math.min(80, Math.max(0, resistance));
  return maxHealth / (1 - safeResistance / 100);
}

export function getWeaponBenchmarkProfile(
  itemId: string,
  masteryLevel: number,
  enchantment: BenchmarkEnchantment = 0,
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
    const totalRatio = abilityTotalRatio(itemId, ability.id, masteryLevel, ability.bonusDamageRatio);
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

export function getWeaponDefensiveBenchmarkProfile(
  itemId: string,
  enchantment: BenchmarkEnchantment = 0,
): WeaponDefensiveBenchmarkProfile {
  const { armorItemIds, offHandItemId } = defensiveLoadoutForWeapon(itemId);
  const itemIds = offHandItemId === undefined
    ? armorItemIds
    : [...armorItemIds, offHandItemId];

  let maxHealth = BASE_HERO_MAX_HEALTH;
  let armor = 0;
  let magicResistance = 0;
  for (const defensiveItemId of itemIds) {
    maxHealth += effectiveEquipmentStat(defensiveItemId, "stat_max_health", enchantment);
    armor += effectiveEquipmentStat(defensiveItemId, "stat_armor", enchantment);
    magicResistance += effectiveEquipmentStat(defensiveItemId, "stat_magic_resistance", enchantment);
  }

  const physicalEffectiveHealth = effectiveHealth(maxHealth, armor);
  const magicalEffectiveHealth = effectiveHealth(maxHealth, magicResistance);
  return {
    itemId,
    enchantment,
    maxHealth,
    armor,
    magicResistance,
    physicalEffectiveHealth,
    magicalEffectiveHealth,
    averageEffectiveHealth: (physicalEffectiveHealth + magicalEffectiveHealth) / 2,
    offHandItemId,
  };
}

export function getWeaponCombatBenchmarkProfile(
  itemId: string,
  masteryLevel: number,
  enchantment: BenchmarkEnchantment = 0,
): WeaponCombatBenchmarkProfile {
  return {
    offense: getWeaponBenchmarkProfile(itemId, masteryLevel, enchantment),
    defense: getWeaponDefensiveBenchmarkProfile(itemId, enchantment),
  };
}

/**
 * Synthetic reference = median sustained output of the compared set, never one
 * live weapon. +/-10% is the first-pass offensive envelope.
 */
export function getSyntheticIdealWeaponProfile(
  profiles: readonly WeaponBenchmarkProfile[],
  masteryLevel: number,
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

/**
 * Combat ideal keeps offense and defense as separate budgets. We deliberately
 * do not collapse them into one arbitrary score: a 1H shield build is allowed
 * to trade clear speed for survivability while 2H builds do the inverse.
 */
export function getSyntheticIdealCombatProfile(
  profiles: readonly WeaponCombatBenchmarkProfile[],
  masteryLevel: number,
): SyntheticIdealCombatProfile {
  const comparable = profiles.filter((profile) => profile.offense.masteryLevel === masteryLevel);
  const offense = getSyntheticIdealWeaponProfile(
    comparable.map((profile) => profile.offense),
    masteryLevel,
  );
  const physicalEffectiveHealth = median(
    comparable.map((profile) => profile.defense.physicalEffectiveHealth),
  );
  const magicalEffectiveHealth = median(
    comparable.map((profile) => profile.defense.magicalEffectiveHealth),
  );
  return {
    ...offense,
    physicalEffectiveHealth,
    magicalEffectiveHealth,
    averageEffectiveHealth: (physicalEffectiveHealth + magicalEffectiveHealth) / 2,
  };
}
