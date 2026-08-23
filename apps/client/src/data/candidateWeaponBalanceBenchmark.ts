import type { CombatRuntimeBenchmarkDamageTuning } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics.js";
import { getWeaponAttackSpeed } from "./itemPower.js";
import {
  getSyntheticIdealCombatProfile,
  getSyntheticIdealWeaponProfile,
  getWeaponBenchmarkProfile,
  getWeaponDefensiveBenchmarkProfile,
  type BenchmarkDefensiveLoadout,
  type BenchmarkEnchantment,
  type WeaponBenchmarkProfile,
  type WeaponCombatBenchmarkProfile,
} from "./weaponIdealBenchmark.js";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog.js";

const LONGBOW_AUTO_ATTACK_MULTIPLIER = 0.84;
const INFERNAL_EFFECT_DAMAGE_MULTIPLIER = 1.5;
const DIRECT_ABILITY_MULTIPLIER_BY_ID: Readonly<Record<string, number>> = {
  ability_fire_fireball: 1.05,
  ability_fire_cataclysm: 1.1,
  ability_dagger_double_slash: 1.1,
  ability_dagger_flurry: 1.1,
};

const round = (value: number, digits = 1): number => Number(value.toFixed(digits));

function isLongbow(itemId: string): boolean {
  return itemId.includes("_bow_") && itemId.includes("_longbow");
}

function isInfernal(itemId: string): boolean {
  return itemId.includes("_staff_") && itemId.includes("_infernal");
}

function isDualDagger(itemId: string): boolean {
  return itemId.includes("_dagger_") && itemId.includes("_pair");
}

export function resolveCandidateRuntimeDamageTuning(itemId: string): CombatRuntimeBenchmarkDamageTuning | undefined {
  if (isLongbow(itemId)) {
    return { autoAttackMultiplier: LONGBOW_AUTO_ATTACK_MULTIPLIER };
  }
  if (isInfernal(itemId)) {
    return {
      directAbilityMultiplierById: {
        ability_fire_fireball: DIRECT_ABILITY_MULTIPLIER_BY_ID.ability_fire_fireball ?? 1,
        ability_fire_cataclysm: DIRECT_ABILITY_MULTIPLIER_BY_ID.ability_fire_cataclysm ?? 1,
      },
      effectDamageMultiplier: INFERNAL_EFFECT_DAMAGE_MULTIPLIER,
    };
  }
  if (isDualDagger(itemId)) {
    return {
      directAbilityMultiplierById: {
        ability_dagger_double_slash: DIRECT_ABILITY_MULTIPLIER_BY_ID.ability_dagger_double_slash ?? 1,
        ability_dagger_flurry: DIRECT_ABILITY_MULTIPLIER_BY_ID.ability_dagger_flurry ?? 1,
      },
    };
  }
  return undefined;
}

function hasUnlockedEffect(itemId: string, masteryLevel: number, effectId: string): boolean {
  return resolveUnlockedWeaponAbilities(itemId, masteryLevel).some((ability) =>
    (getWeaponAbilityMechanics(ability.id)?.mechanics ?? []).some((mechanic) =>
      (mechanic.kind === "status" || mechanic.kind === "dot") && mechanic.effectId === effectId,
    ),
  );
}

function abilityRatios(itemId: string, abilityId: string, masteryLevel: number, fallbackBonusRatio: number): { direct: number; dot: number } {
  const mechanics = getWeaponAbilityMechanics(abilityId);
  if (mechanics === undefined) return { direct: 1 + fallbackBonusRatio, dot: 0 };
  let direct = 0;
  let dot = 0;
  for (const mechanic of mechanics.mechanics) {
    if (mechanic.kind === "damage") {
      let ratio = 1 + mechanic.ratio;
      if (mechanic.bonusHealthBelow !== undefined) ratio += mechanic.bonusHealthBelow.bonusRatio;
      if (mechanic.bonusEffect !== undefined && hasUnlockedEffect(itemId, masteryLevel, mechanic.bonusEffect.effectId)) {
        ratio += mechanic.bonusEffect.bonusRatio;
      }
      direct += ratio;
    } else if (mechanic.kind === "dot") {
      dot += mechanic.ratio * mechanic.ticks;
    }
  }
  return { direct, dot };
}

function sustainedAvailability(itemId: string, abilityId: string, masteryLevel: number): number {
  const rule = getWeaponAbilityMechanics(abilityId)?.autoRule;
  if (rule === undefined || rule.kind === "always") return 1;
  if (rule.kind === "target_health_below") return Math.max(0, Math.min(1, rule.ratio));
  if (rule.kind === "target_has_effect") return hasUnlockedEffect(itemId, masteryLevel, rule.effectId) ? 1 : 0;
  return 1;
}

function openerAvailability(itemId: string, abilityId: string, masteryLevel: number): number {
  const rule = getWeaponAbilityMechanics(abilityId)?.autoRule;
  if (rule === undefined || rule.kind === "always") return 1;
  if (rule.kind === "target_health_below") return 0;
  if (rule.kind === "target_has_effect") return hasUnlockedEffect(itemId, masteryLevel, rule.effectId) ? 1 : 0;
  return 1;
}

function castsInsideWindow(cooldown: number, windowSeconds: number): number {
  const safeCooldown = Math.max(0.5, cooldown);
  return 1 + Math.floor(Math.max(0, windowSeconds - 1e-9) / safeCooldown);
}

function directMultiplier(itemId: string, abilityId: string): number {
  if (!isInfernal(itemId) && !isDualDagger(itemId)) return 1;
  return DIRECT_ABILITY_MULTIPLIER_BY_ID[abilityId] ?? 1;
}

function dotMultiplier(itemId: string): number {
  return isInfernal(itemId) ? INFERNAL_EFFECT_DAMAGE_MULTIPLIER : 1;
}

export function getCandidateWeaponBenchmarkProfile(
  itemId: string,
  masteryLevel: number,
  enchantment: BenchmarkEnchantment,
): WeaponBenchmarkProfile {
  const baseline = getWeaponBenchmarkProfile(itemId, masteryLevel, enchantment);
  const attackSpeed = getWeaponAttackSpeed(itemId) ?? 1;
  const sourceDamage = attackSpeed > 0 ? baseline.autoAttackDps / attackSpeed : 0;
  const autoAttackDps = baseline.autoAttackDps * (isLongbow(itemId) ? LONGBOW_AUTO_ATTACK_MULTIPLIER : 1);
  const unlocked = resolveUnlockedWeaponAbilities(itemId, masteryLevel);

  const abilityDps = unlocked.reduce((total, ability) => {
    const ratios = abilityRatios(itemId, ability.id, masteryLevel, ability.bonusDamageRatio);
    const adjustedRatio = ratios.direct * directMultiplier(itemId, ability.id) + ratios.dot * dotMultiplier(itemId);
    return total + sourceDamage * adjustedRatio * sustainedAvailability(itemId, ability.id, masteryLevel) / Math.max(0.5, ability.cooldown);
  }, 0);

  const opener = (windowSeconds: number): number => {
    let total = autoAttackDps * windowSeconds;
    for (const ability of unlocked) {
      const availability = openerAvailability(itemId, ability.id, masteryLevel);
      if (availability <= 0) continue;
      const ratios = abilityRatios(itemId, ability.id, masteryLevel, ability.bonusDamageRatio);
      const adjustedRatio = ratios.direct * directMultiplier(itemId, ability.id) + ratios.dot * dotMultiplier(itemId);
      total += sourceDamage * adjustedRatio * castsInsideWindow(ability.cooldown, windowSeconds) * availability;
    }
    return total / Math.max(0.001, windowSeconds);
  };

  return {
    ...baseline,
    sustainedDps: autoAttackDps + abilityDps,
    openerDps5s: opener(5),
    openerDps10s: opener(10),
    autoAttackDps,
    abilityDps,
  };
}

export function buildCandidateWeaponOnlyBenchmark(
  itemIds: readonly string[],
  masteryLevel: number,
  enchantment: BenchmarkEnchantment,
) {
  const profiles = itemIds.map((itemId) => getCandidateWeaponBenchmarkProfile(itemId, masteryLevel, enchantment));
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

export function buildCandidateWeaponPackageBenchmark(
  itemIds: readonly string[],
  masteryLevel: number,
  enchantment: BenchmarkEnchantment,
  resolveLoadout: (itemId: string) => BenchmarkDefensiveLoadout,
) {
  const profiles: readonly WeaponCombatBenchmarkProfile[] = itemIds.map((itemId) => ({
    offense: getCandidateWeaponBenchmarkProfile(itemId, masteryLevel, enchantment),
    defense: getWeaponDefensiveBenchmarkProfile(itemId, enchantment, resolveLoadout(itemId)),
  }));
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
