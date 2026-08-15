import type { WorldBandId } from "./world-bands.js";

export const SEGMENTS_PER_ZONE = 10;
export const ENCOUNTERS_PER_SEGMENT = 5;
export const ENCOUNTER_DIFFICULTY_GROWTH = 0.025;
export const REWARD_RANKS_PER_ZONE = 5;

export interface ZoneCombatCurve {
  readonly healthStart: number;
  readonly healthEnd: number;
  readonly damageStart: number;
  readonly damageEnd: number;
  readonly defenseStart: number;
  readonly defenseEnd: number;
}

/**
 * Blue progression contract (live CombatRuntime is the balance source of truth):
 * - Birch Forest: starter weapon only, discovery, no real friction.
 * - Early Dark Swamp: first meaningful starter wall.
 * - Swamp S2-S6: 1-2 T3 armor crafts should buy a few segments each.
 * - Swamp S6-S10: quasi/full T3 consolidation.
 * - Swamp S10: full T3 must be clearable without a potion.
 * - Highlands: T3 -> first T4 transition.
 * - Steppe: full T4.0 / first enchantments.
 * - Frostpeak: T4.1 -> T4.2, with T4.2 able to clear S10 and T4.3 providing comfort.
 *
 * Forest/Swamp are calibrated first. Later Blue zones intentionally keep their
 * previous values until the T3 progression block is validated in live runtime.
 */
export const BLUE_WORLD_COMBAT_CURVE = [
  // Forest: lower late-zone pressure so every starter weapon can finish the tutorial/discovery zone.
  { healthStart: 0.86, healthEnd: 1.02, damageStart: 0.66, damageEnd: 0.9, defenseStart: 0.86, defenseEnd: 0.94 },
  // Swamp: preserve an early naked wall, but flatten the old late damage spike so T3 armor progression matters.
  { healthStart: 1.08, healthEnd: 1.48, damageStart: 1.05, damageEnd: 1.32, defenseStart: 0.96, defenseEnd: 1.08 },
  { healthStart: 1.7, healthEnd: 2.3, damageStart: 2.6, damageEnd: 3.0, defenseStart: 1.15, defenseEnd: 1.3 },
  { healthStart: 2.3, healthEnd: 3.1, damageStart: 3.0, damageEnd: 3.3, defenseStart: 1.3, defenseEnd: 1.5 },
  { healthStart: 3.1, healthEnd: 4.0, damageStart: 3.3, damageEnd: 3.5, defenseStart: 1.5, defenseEnd: 1.8 },
] as const;

/**
 * First Yellow-world curve. It deliberately remains independently authored.
 * Yellow will receive its own dedicated T5 balance pass after Blue and weapon
 * envelopes are validated in runtime.
 */
export const YELLOW_WORLD_COMBAT_CURVE = [
  { healthStart: 4.3, healthEnd: 4.75, damageStart: 4.8, damageEnd: 5.2, defenseStart: 2.1, defenseEnd: 2.3 },
  { healthStart: 4.75, healthEnd: 5.25, damageStart: 5.21, damageEnd: 5.65, defenseStart: 2.3, defenseEnd: 2.5 },
  { healthStart: 5.25, healthEnd: 5.85, damageStart: 5.66, damageEnd: 6.2, defenseStart: 2.5, defenseEnd: 2.75 },
  { healthStart: 5.85, healthEnd: 6.5, damageStart: 6.21, damageEnd: 7, defenseStart: 2.75, defenseEnd: 3 },
  { healthStart: 6.5, healthEnd: 7.2, damageStart: 7.01, damageEnd: 8, defenseStart: 3, defenseEnd: 3.2 },
] as const;

/** Backwards-compatible name retained while existing Blue-world tests migrate. */
export const WORLD_ONE_COMBAT_CURVE = BLUE_WORLD_COMBAT_CURVE;

export interface WorldCombatProgressionDefinition {
  readonly curve: readonly ZoneCombatCurve[];
  readonly rewardRankOffset: number;
}

/**
 * Only authored combat bands belong here. Planned bands deliberately have no
 * fallback so adding Yellow content cannot silently reuse Blue balancing.
 */
export const WORLD_COMBAT_PROGRESSION: Partial<
  Readonly<Record<WorldBandId, WorldCombatProgressionDefinition>>
> = {
  blue: {
    curve: BLUE_WORLD_COMBAT_CURVE,
    rewardRankOffset: 0,
  },
  yellow: {
    curve: YELLOW_WORLD_COMBAT_CURVE,
    rewardRankOffset: BLUE_WORLD_COMBAT_CURVE.length * REWARD_RANKS_PER_ZONE,
  },
} as const;

export function getWorldCombatProgression(
  bandId: WorldBandId,
): WorldCombatProgressionDefinition {
  const definition = WORLD_COMBAT_PROGRESSION[bandId];
  if (definition === undefined) {
    throw new Error(`Combat progression is not authored for world band: ${bandId}`);
  }
  return definition;
}
