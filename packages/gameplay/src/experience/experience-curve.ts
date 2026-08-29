import {
  GATHERING_MASTERY_EXPERIENCE_BALANCE,
  WEAPON_MASTERY_EXPERIENCE_BALANCE,
} from "@game/data";

/**
 * Deterministic Mastery Experience Curve Generator (28_EXPERIENCE_SYSTEM).
 *
 * Preserves authored early-game progression (Levels 1..10) exactly, and extends
 * subsequent generated levels using a power curve with player-friendly
 * readability rounding and strict monotonic progression checks.
 */

export const WEAPON_MASTERY_BASE_XP = WEAPON_MASTERY_EXPERIENCE_BALANCE.baseXpLevels1To10;
export const GATHERING_MASTERY_BASE_XP = GATHERING_MASTERY_EXPERIENCE_BALANCE.baseXpLevels1To10;

/**
 * Player-friendly XP requirement rounding:
 * - XP < 10,000 → round to nearest 10
 * - XP 10,000..99,999 → round to nearest 100
 * - XP >= 100,000 → round to nearest 1,000
 */
export function roundXpRequirement(rawXp: number): number {
  if (rawXp < 10000) {
    return Math.round(rawXp / 10) * 10;
  }
  if (rawXp < 100000) {
    return Math.round(rawXp / 100) * 100;
  }
  return Math.round(rawXp / 1000) * 1000;
}

export function getRoundingIncrement(xp: number): number {
  if (xp < 10000) return 10;
  if (xp < 100000) return 100;
  return 1000;
}

/**
 * Generates a deterministic mastery experience curve.
 * Levels 1..10 are preserved from baseArray.
 * Later generated levels use raw(L) = XP_10 + round(A * (L - 10)^p) with
 * readability rounding and strict monotonic progression enforcement.
 */
export function generateMasteryExperienceCurve(
  base1to10: readonly number[],
  A: number,
  p: number,
  maxLevel = 100,
): readonly number[] {
  const reqs = [...base1to10];
  const baseLen = base1to10.length;
  const xpAnchor = base1to10[baseLen - 1] ?? 0;

  for (let l = baseLen + 1; l <= maxLevel; l++) {
    const delta = l - baseLen;
    const raw = xpAnchor + Math.round(A * Math.pow(delta, p));
    let rounded = roundXpRequirement(raw);
    const prev = reqs[reqs.length - 1] ?? 0;
    if (rounded <= prev) {
      rounded = prev + getRoundingIncrement(prev);
    }
    reqs.push(rounded);
  }

  return reqs;
}

const GENERATED_WEAPON_MASTERY_XP = generateMasteryExperienceCurve(
  WEAPON_MASTERY_BASE_XP,
  WEAPON_MASTERY_EXPERIENCE_BALANCE.extensionCoefficient,
  WEAPON_MASTERY_EXPERIENCE_BALANCE.extensionExponent,
  WEAPON_MASTERY_EXPERIENCE_BALANCE.generatedThroughLevel,
);

/**
 * Long-term Weapon Mastery Experience Curve.
 *
 * Levels 1..65 retain the validated generated curve. Levels 66..100 are
 * authored canonically in data so late-game mastery pacing can evolve with
 * T7/T8 Fame throughput without perturbing early and mid-game progression.
 */
export const WEAPON_MASTERY_XP: readonly number[] = [
  ...GENERATED_WEAPON_MASTERY_XP,
  ...WEAPON_MASTERY_EXPERIENCE_BALANCE.authoredXpLevels66To100,
];

if (WEAPON_MASTERY_XP.length !== WEAPON_MASTERY_EXPERIENCE_BALANCE.maxLevel) {
  throw new Error(
    `Weapon mastery XP curve has ${String(WEAPON_MASTERY_XP.length)} levels; expected ${String(WEAPON_MASTERY_EXPERIENCE_BALANCE.maxLevel)}`,
  );
}

/** Long-term Gathering Mastery Experience Curve. */
export const GATHERING_MASTERY_XP: readonly number[] = generateMasteryExperienceCurve(
  GATHERING_MASTERY_BASE_XP,
  GATHERING_MASTERY_EXPERIENCE_BALANCE.extensionCoefficient,
  GATHERING_MASTERY_EXPERIENCE_BALANCE.extensionExponent,
  GATHERING_MASTERY_EXPERIENCE_BALANCE.maxLevel,
);