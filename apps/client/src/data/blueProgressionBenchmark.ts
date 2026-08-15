import { ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { getEnemyCombatProfile, type ZoneDefinitionId } from "@game/gameplay";
import {
  HEALTH_POTION_COOLDOWN_SECONDS,
  HEALTH_POTION_HEAL_RATIO,
} from "./economyContentCatalog";
import { resolveMonsterForEncounter } from "./monsterContentCatalog";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics";
import { resolveEquipmentInfo } from "./itemContentCatalog";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog";
import {
  getWeaponCombatBenchmarkProfile,
  type BenchmarkEnchantment,
  type WeaponCombatBenchmarkProfile,
} from "./weaponIdealBenchmark";
import { getWorldZonePlacement } from "./worldContentCatalog";

export interface BlueSegmentBenchmarkInput {
  readonly weaponItemId: string;
  readonly masteryLevel: number;
  readonly enchantment: BenchmarkEnchantment;
  readonly zoneDefId: ZoneDefinitionId;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
  /** Simulates skilled/manual potion usage. Cooldown still applies normally. */
  readonly useHealthPotions?: boolean;
}

export interface SyntheticBlueSegmentBenchmarkInput {
  readonly weaponItemIds: readonly string[];
  readonly masteryLevel: number;
  readonly enchantment: BenchmarkEnchantment;
  readonly zoneDefId: ZoneDefinitionId;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
  /** Simulates skilled/manual potion usage. Cooldown still applies normally. */
  readonly useHealthPotions?: boolean;
}

export interface BlueEncounterBenchmarkResult {
  readonly encounterIndex: number;
  readonly monsterId: string;
  readonly timeToKillSeconds: number;
  readonly damageTaken: number;
  readonly healthAfter: number;
  readonly startedAtFullHealth: boolean;
  readonly potionsUsed: number;
}

export interface BlueSegmentBenchmarkResult {
  readonly clear: boolean;
  readonly totalTimeSeconds: number;
  readonly totalDamageTaken: number;
  readonly remainingHealth: number;
  readonly remainingHealthRatio: number;
  readonly potionsUsed: number;
  readonly encounters: readonly BlueEncounterBenchmarkResult[];
}

interface NeutralCombatEnvelope {
  readonly sustainedDps: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
}

interface IncomingDamageResolution {
  readonly healthAfter: number;
  readonly cooldownAfter: number;
  readonly potionsUsed: number;
  readonly survived: boolean;
}

const POTION_USE_HEALTH_RATIO = 1 - HEALTH_POTION_HEAL_RATIO;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
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

/** Average resistance reduction produced by unlocked auto-cast abilities. */
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

function syntheticEnvelope(profiles: readonly WeaponCombatBenchmarkProfile[]): NeutralCombatEnvelope {
  if (profiles.length === 0) throw new Error("Synthetic Blue benchmark requires at least one weapon");
  return {
    sustainedDps: median(profiles.map((profile) => profile.offense.sustainedDps)),
    maxHealth: median(profiles.map((profile) => profile.defense.maxHealth)),
    armor: median(profiles.map((profile) => profile.defense.armor)),
    magicResistance: median(profiles.map((profile) => profile.defense.magicResistance)),
  };
}

function assertBluePlacement(zoneDefId: ZoneDefinitionId) {
  const placement = getWorldZonePlacement(zoneDefId);
  if (placement.bandId !== "blue") {
    throw new Error(`Blue benchmark cannot simulate ${placement.bandId} content`);
  }
  return placement;
}

/**
 * Applies continuous incoming pressure for one encounter. Potion usage models a
 * skilled player: use only when at least the full 30% heal can be consumed,
 * then respect the real 20 s cooldown. The cooldown is ready at segment start,
 * matching ConsumableRuntime's segment-start reset, but the pre-encounter-5
 * full heal does not reset the potion cooldown.
 */
function resolveIncomingDamage(
  health: number,
  maxHealth: number,
  enemyDps: number,
  duration: number,
  initialCooldown: number,
  useHealthPotions: boolean,
): IncomingDamageResolution {
  if (enemyDps <= 0 || duration <= 0) {
    return {
      healthAfter: health,
      cooldownAfter: Math.max(0, initialCooldown - duration),
      potionsUsed: 0,
      survived: health > 0,
    };
  }

  let currentHealth = health;
  let cooldown = Math.max(0, initialCooldown);
  let remaining = duration;
  let potionsUsed = 0;
  const thresholdHealth = maxHealth * POTION_USE_HEALTH_RATIO;
  const healAmount = Math.ceil(maxHealth * HEALTH_POTION_HEAL_RATIO);

  while (remaining > 1e-9 && currentHealth > 0) {
    if (useHealthPotions && cooldown <= 1e-9 && currentHealth <= thresholdHealth) {
      currentHealth = Math.min(maxHealth, currentHealth + healAmount);
      cooldown = HEALTH_POTION_COOLDOWN_SECONDS;
      potionsUsed += 1;
      continue;
    }

    const timeToDeath = currentHealth / enemyDps;
    const timeToPotionThreshold = currentHealth > thresholdHealth
      ? (currentHealth - thresholdHealth) / enemyDps
      : Number.POSITIVE_INFINITY;
    const timeToCooldownReady = cooldown > 1e-9
      ? cooldown
      : Number.POSITIVE_INFINITY;
    const step = Math.min(
      remaining,
      timeToDeath,
      timeToPotionThreshold,
      timeToCooldownReady,
    );

    if (!Number.isFinite(step) || step <= 1e-9) {
      // No future potion event can change the outcome; consume the remainder.
      currentHealth -= enemyDps * remaining;
      cooldown = Math.max(0, cooldown - remaining);
      remaining = 0;
      break;
    }

    currentHealth -= enemyDps * step;
    cooldown = Math.max(0, cooldown - step);
    remaining -= step;
  }

  return {
    healthAfter: Math.max(0, currentHealth),
    cooldownAfter: cooldown,
    potionsUsed,
    survived: currentHealth > 0,
  };
}

function buildResult(
  clear: boolean,
  totalTimeSeconds: number,
  totalDamageTaken: number,
  currentHealth: number,
  maxHealth: number,
  potionsUsed: number,
  encounters: readonly BlueEncounterBenchmarkResult[],
): BlueSegmentBenchmarkResult {
  return {
    clear,
    totalTimeSeconds,
    totalDamageTaken,
    remainingHealth: currentHealth,
    remainingHealthRatio: currentHealth / maxHealth,
    potionsUsed,
    encounters,
  };
}

/**
 * Deterministic progression estimator using the same authored enemy profiles,
 * monster damage types, player equipment stats and weapon ability data as the
 * live runtime. Exact animation/cast timing remains runtime/manual validation.
 */
export function benchmarkBlueSegment(
  input: BlueSegmentBenchmarkInput,
): BlueSegmentBenchmarkResult {
  const placement = assertBluePlacement(input.zoneDefId);
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
  let potionCooldown = 0;
  let totalPotionsUsed = 0;
  let totalDamageTaken = 0;
  let totalTimeSeconds = 0;
  let clear = true;

  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    const startedAtFullHealth = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
    if (startedAtFullHealth) currentHealth = combat.defense.maxHealth;

    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      input.segmentIndex,
      encounterIndex,
      "blue",
    );
    const monster = resolveMonsterForEncounter(input.zoneDefId, input.segmentIndex, encounterIndex);
    const enemyResistance = damageType === "magical" ? enemy.magicResistance : enemy.armor;
    const effectiveEnemyResistance = clampResistance(enemyResistance - resistanceReduction);
    const playerDps = Math.max(1, combat.offense.sustainedDps * (1 - effectiveEnemyResistance / 100));
    const timeToKillSeconds = enemy.hp / playerDps;

    const heroResistance = monster.combat.damageType === "magical"
      ? combat.defense.magicResistance
      : combat.defense.armor;
    const enemyDps = enemy.damage
      * enemy.attackSpeed
      * (1 - clampResistance(heroResistance) / 100)
      * (1 - pressureReduction);
    const theoreticalDamage = enemyDps * timeToKillSeconds;
    const resolved = resolveIncomingDamage(
      currentHealth,
      combat.defense.maxHealth,
      enemyDps,
      timeToKillSeconds,
      potionCooldown,
      input.useHealthPotions === true,
    );
    currentHealth = resolved.healthAfter;
    potionCooldown = resolved.cooldownAfter;
    totalPotionsUsed += resolved.potionsUsed;
    totalDamageTaken += theoreticalDamage;
    totalTimeSeconds += timeToKillSeconds;

    encounters.push({
      encounterIndex,
      monsterId: monster.id,
      timeToKillSeconds,
      damageTaken: theoreticalDamage,
      healthAfter: currentHealth,
      startedAtFullHealth,
      potionsUsed: resolved.potionsUsed,
    });
    if (!resolved.survived) {
      clear = false;
      break;
    }
  }

  return buildResult(
    clear,
    totalTimeSeconds,
    totalDamageTaken,
    currentHealth,
    combat.defense.maxHealth,
    totalPotionsUsed,
    encounters,
  );
}

/**
 * Neutral "ideal weapon" simulation. Offense, HP, Armor and MR are medians of
 * the supplied weapon loadouts. No live weapon's debuff/stun identity is baked
 * into the target. Enemy Armor/MR are averaged for outgoing damage so physical
 * and magical weapon representation remains neutral.
 */
export function benchmarkSyntheticIdealBlueSegment(
  input: SyntheticBlueSegmentBenchmarkInput,
): BlueSegmentBenchmarkResult {
  const placement = assertBluePlacement(input.zoneDefId);
  const profiles = input.weaponItemIds.map((itemId) =>
    getWeaponCombatBenchmarkProfile(itemId, input.masteryLevel, input.enchantment),
  );
  const ideal = syntheticEnvelope(profiles);

  const encounters: BlueEncounterBenchmarkResult[] = [];
  let currentHealth = ideal.maxHealth;
  let potionCooldown = 0;
  let totalPotionsUsed = 0;
  let totalDamageTaken = 0;
  let totalTimeSeconds = 0;
  let clear = true;

  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    const startedAtFullHealth = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
    if (startedAtFullHealth) currentHealth = ideal.maxHealth;

    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      input.segmentIndex,
      encounterIndex,
      "blue",
    );
    const monster = resolveMonsterForEncounter(input.zoneDefId, input.segmentIndex, encounterIndex);
    const neutralEnemyResistance = (enemy.armor + enemy.magicResistance) / 2;
    const playerDps = Math.max(
      1,
      ideal.sustainedDps * (1 - clampResistance(neutralEnemyResistance) / 100),
    );
    const timeToKillSeconds = enemy.hp / playerDps;

    const heroResistance = monster.combat.damageType === "magical"
      ? ideal.magicResistance
      : ideal.armor;
    const enemyDps = enemy.damage
      * enemy.attackSpeed
      * (1 - clampResistance(heroResistance) / 100);
    const theoreticalDamage = enemyDps * timeToKillSeconds;
    const resolved = resolveIncomingDamage(
      currentHealth,
      ideal.maxHealth,
      enemyDps,
      timeToKillSeconds,
      potionCooldown,
      input.useHealthPotions === true,
    );
    currentHealth = resolved.healthAfter;
    potionCooldown = resolved.cooldownAfter;
    totalPotionsUsed += resolved.potionsUsed;
    totalDamageTaken += theoreticalDamage;
    totalTimeSeconds += timeToKillSeconds;

    encounters.push({
      encounterIndex,
      monsterId: monster.id,
      timeToKillSeconds,
      damageTaken: theoreticalDamage,
      healthAfter: currentHealth,
      startedAtFullHealth,
      potionsUsed: resolved.potionsUsed,
    });
    if (!resolved.survived) {
      clear = false;
      break;
    }
  }

  return buildResult(
    clear,
    totalTimeSeconds,
    totalDamageTaken,
    currentHealth,
    ideal.maxHealth,
    totalPotionsUsed,
    encounters,
  );
}
