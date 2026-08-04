import type { DamageType } from "./types.js";

/**
 * Damage pipeline per AI_BIBLE 21_DAMAGE_SYSTEM:
 * - Physical damage is reduced by Armor only.
 * - Magical damage is reduced by Magic Resistance only.
 * - True damage ignores every resistance.
 * - Resistances are percentage points (e.g. 40 = 40%) capped at 80%.
 * - Every successful damage request inflicts at least 1 damage (minimum damage rule).
 */

/** Resistance cap: armor and magic resistance can never exceed 80% (Rules 10 & 11). */
export const RESISTANCE_CAP_PERCENT = 80;

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

function resistanceRatio(percentPoints: number): number {
  const clamped = Math.min(Math.max(percentPoints, 0), RESISTANCE_CAP_PERCENT);
  return clamped / 100;
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
      reduction = resistanceRatio(defenderStats.armor);
      break;
    case "magical":
      rawDamage = Math.max(0, baseDamage + attackerStats.magicalDamage);
      reduction = resistanceRatio(defenderStats.magicResistance);
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
