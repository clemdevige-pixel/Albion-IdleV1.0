import { ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { getEnemyCombatProfile, type ZoneDefinitionId } from "@game/gameplay";
import { resolveMonsterForEncounter } from "./monsterContentCatalog";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics";
import { resolveEquipmentInfo } from "./itemContentCatalog";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog";
import {
  getWeaponCombatBenchmarkProfile,
  type BenchmarkEnchantment,
} from "./weaponIdealBenchmark";
import { getWorldZonePlacement } from "./worldContentCatalog";

export interface BlueSegmentBenchmarkInput {
  readonly weaponItemId: string;
  readonly masteryLevel: number;
  readonly enchantment: BenchmarkEnchantment;
  readonly zoneDefId: ZoneDefinitionId;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
}

export interface BlueEncounterBenchmarkResult {
  readonly encounterIndex: number;
  readonly monsterId: string;
  readonly timeToKillSeconds: number;
  readonly damageTaken: number;
  readonly healthAfter: number;
  readonly startedAtFullHealth: boolean;
}

export interface BlueSegmentBenchmarkResult {
  readonly clear: boolean;
  readonly totalTimeSeconds: number;
  readonly totalDamageTaken: number;
  readonly remainingHealth: number;
  readonly remainingHealthRatio: number;
  readonly encounters: readonly BlueEncounterBenchmarkResult[];
}

function clampResistance(value: number): number {
  return Math.min(80, Math.max(0, value));
}

function availabilityFactor(itemId: string, masteryLevel: number, abilityId: string): number {
  const rule = getWeaponAbilityMechanics(abilityId)?.autoRule;
  if (rule === undefined || rule.kind === "always") return 1;
  if (rule.kind === "target_health_below") return Math.max(0, Math.min(1, rule.ratio));
  if (rule.kind === "target_has_effect") {
    const prerequisite = resolveUnlockedWeaponAbilities(itemId, masteryLevel).some((ability) =>
      (getWeaponAbilityMechanics(ability.id)?.mechanics ?? []).some((mechanic) =>
        (mechanic.kind === "status" || mechanic.kind === "dot")
        && mechanic.effectId === rule.effectId,
      ),
    );
    return prerequisite ? 1 : 0;
  }
  return 1;
}

/**
 * Average resistance reduction produced by unlocked auto-cast abilities.
 * This is deliberately an uptime estimate, not a second combat runtime.
 */
function averageResistanceReduction(
  itemId: string,
  masteryLevel: number,
  statId: "stat_armor" | "stat_magic_resistance",
): number {
  let reduction = 0;
  for (const ability of resolveUnlockedWeaponAbilities(itemId, masteryLevel)) {
    const availability = availabilityFactor(itemId, masteryLevel, ability.id);
    const mechanics = getWeaponAbilityMechanics(ability.id)?.mechanics ?? [];
    for (const mechanic of mechanics) {
      if (
        mechanic.kind !== "status"
        || mechanic.statId !== statId
        || mechanic.statDelta === undefined
        || mechanic.statDelta >= 0
      ) continue;
      const uptime = Math.min(1, mechanic.duration / Math.max(0.5, ability.cooldown));
      reduction += -mechanic.statDelta * uptime * availability;
    }
  }
  return reduction;
}

/** Fraction of enemy attack pressure suppressed by authored stun uptime. */
function controlPressureReduction(itemId: string, masteryLevel: number): number {
  let uptime = 0;
  for (const ability of resolveUnlockedWeaponAbilities(itemId, masteryLevel)) {
    const availability = availabilityFactor(itemId, masteryLevel, ability.id);
    const mechanics = getWeaponAbilityMechanics(ability.id)?.mechanics ?? [];
    for (const mechanic of mechanics) {
      if (mechanic.kind !== "status" || mechanic.effectType !== "stun") continue;
      uptime += mechanic.duration / Math.max(0.5, ability.cooldown) * availability;
    }
  }
  return Math.min(0.3, Math.max(0, uptime));
}

function weaponDamageType(itemId: string): "physical" | "magical" {
  const stats = resolveEquipmentInfo(itemId)?.stats;
  return (stats?.stat_magical_damage ?? 0) > (stats?.stat_physical_damage ?? 0)
    ? "magical"
    : "physical";
}

/**
 * Deterministic progression estimator using the same authored enemy profiles,
 * monster damage types, player equipment stats and weapon ability data as the
 * live runtime.
 *
 * Runtime-specific timing details (animation frames, exact first-cast timing,
 * overkill holds) stay out of this model. The benchmark is a balance guardrail,
 * while final validation remains a short manual/runtime test.
 */
export function benchmarkBlueSegment(
  input: BlueSegmentBenchmarkInput,
): BlueSegmentBenchmarkResult {
  const placement = getWorldZonePlacement(input.zoneDefId);
  if (placement.bandId !== "blue") {
    throw new Error(`Blue benchmark cannot simulate ${placement.bandId} content`);
  }

  const combat = getWeaponCombatBenchmarkProfile(
    input.weaponItemId,
    input.masteryLevel,
    input.enchantment,
  );
  const damageType = weaponDamageType(input.weaponItemId);
  const resistanceStat = damageType === "magical" ? "stat_magic_resistance" : "stat_armor";
  const resistanceReduction = averageResistanceReduction(
    input.weaponItemId,
    input.masteryLevel,
    resistanceStat,
  );
  const pressureReduction = controlPressureReduction(input.weaponItemId, input.masteryLevel);

  const encounters: BlueEncounterBenchmarkResult[] = [];
  let currentHealth = combat.defense.maxHealth;
  let totalDamageTaken = 0;
  let totalTimeSeconds = 0;
  let clear = true;

  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    // Live CombatRuntime restores the hero immediately before encounter five.
    const startedAtFullHealth = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
    if (startedAtFullHealth) currentHealth = combat.defense.maxHealth;

    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      input.segmentIndex,
      encounterIndex,
      "blue",
    );
    const monster = resolveMonsterForEncounter(
      input.zoneDefId,
      input.segmentIndex,
      encounterIndex,
    );
    const enemyResistance = damageType === "magical"
      ? enemy.magicResistance
      : enemy.armor;
    const effectiveEnemyResistance = clampResistance(enemyResistance - resistanceReduction);
    const playerDps = Math.max(
      1,
      combat.offense.sustainedDps * (1 - effectiveEnemyResistance / 100),
    );
    const timeToKillSeconds = enemy.hp / playerDps;

    const heroResistance = monster.combat.damageType === "magical"
      ? combat.defense.magicResistance
      : combat.defense.armor;
    const enemyDps = enemy.damage
      * enemy.attackSpeed
      * (1 - clampResistance(heroResistance) / 100)
      * (1 - pressureReduction);
    const damageTaken = enemyDps * timeToKillSeconds;
    currentHealth -= damageTaken;
    totalDamageTaken += damageTaken;
    totalTimeSeconds += timeToKillSeconds;

    encounters.push({
      encounterIndex,
      monsterId: monster.id,
      timeToKillSeconds,
      damageTaken,
      healthAfter: Math.max(0, currentHealth),
      startedAtFullHealth,
    });

    if (currentHealth <= 0) {
      clear = false;
      currentHealth = 0;
      break;
    }
  }

  return {
    clear,
    totalTimeSeconds,
    totalDamageTaken,
    remainingHealth: currentHealth,
    remainingHealthRatio: currentHealth / combat.defense.maxHealth,
    encounters,
  };
}
