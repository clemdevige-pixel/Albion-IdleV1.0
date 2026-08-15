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
 * Blue progression contract:
 * - Forest is comfortable in T3.0.
 * - Mid/late Dark Swamp is the first real T4 pressure point. Optimised T3.0 can
 *   still finish the zone, but the final stretch is expected to use potions.
 * - T4.0 restores comfort after the transition, then T4.1 is progressively
 *   pressured through Steppe/Mountain.
 * - Mountain S10 is a difficult T4.2 clear with potion usage.
 * - T4.3 should remove the potion dependency and provide AFK/farm headroom.
 *
 * These values are crossed against the synthetic offensive/defensive player
 * envelope. Potions are part of the difficult-clear budget; the full heal before
 * encounter five remains a separate runtime rule.
 */
export const BLUE_WORLD_COMBAT_CURVE = [
  { healthStart: 0.9, healthEnd: 1.15, damageStart: 0.75, damageEnd: 1.2, defenseStart: 0.9, defenseEnd: 1.0 },
  { healthStart: 1.15, healthEnd: 1.7, damageStart: 1.2, damageEnd: 2.6, defenseStart: 1.0, defenseEnd: 1.15 },
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
