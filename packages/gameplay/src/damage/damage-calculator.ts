import type { DamageType } from "./types.js";

/**
 * Damage pipeline:
 * - Physical damage is reduced by Armor only.
 * - Magical damage is reduced by Magic Resistance only.
 * - True damage ignores every resistance.
 * - Armor and Magic Resistance are rating values converted through a diminishing-return curve.
 * - Every successful damage request inflicts at least 1 damage (minimum damage rule).
 */

/**
 * Resistance rating at which mitigation reaches 50%.
 * Keep this authored in one place: both Armor and Magic Resistance use the same curve.
 */
export const RESISTANCE_SCALING_CONSTANT = 100;

export interface AttackerDamageStats {
  readonly physicalDamage: number;
  readonly magicalDamage: number;
}

export interface DefenderDamageStats {
  readonly armor: number;
  readonly magicResistance: number;
}

export interface DamageCalculation {
  readonly rawDamage: number;
  readonly mitigatedDamage: number;
}

/**
 * Converts a resistance rating into the live mitigation ratio.
 * Formula: resistance / (resistance + K), K = RESISTANCE_SCALING_CONSTANT.
 * There is intentionally no hard cap: every additional resistance point keeps value,
 * while naturally yielding diminishing returns.
 */
export function calculateResistanceMitigation(resistance: number): number {
  const safeResistance = Math.max(0, resistance);
  return safeResistance / (safeResistance + RESISTANCE_SCALING_CONSTANT);
}

export function calculateDamage(
  baseDamage: number,
  attackerStats: AttackerDamageStats,
  defenderStats: DefenderDamageStats,
  damageType: DamageType,
): DamageCalculation {
  let rawDamage: number;
  let reduction: number;

  switch (damageType) {
    case "physical":
      rawDamage = Math.max(0, baseDamage + attackerStats.physicalDamage);
      reduction = calculateResistanceMitigation(defenderStats.armor);
      break;
    case "magical":
      rawDamage = Math.max(0, baseDamage + attackerStats.magicalDamage);
      reduction = calculateResistanceMitigation(defenderStats.magicResistance);
      break;
    case "true":
      rawDamage = Math.max(0, baseDamage);
      reduction = 0;
      break;
  }

  if (rawDamage <= 0) {
    return { rawDamage: 0, mitigatedDamage: 0 };
  }

  // Minimum damage rule: a successful request always inflicts at least 1 damage.
  const mitigatedDamage = Math.max(1, rawDamage * (1 - reduction));
  return { rawDamage, mitigatedDamage };
}
