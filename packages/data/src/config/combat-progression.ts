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

export const BLUE_WORLD_COMBAT_CURVE = [
  { healthStart: 1, healthEnd: 1.9, damageStart: 1.3, damageEnd: 2.4, defenseStart: 1, defenseEnd: 1.15 },
  { healthStart: 1.9, healthEnd: 2.25, damageStart: 2.35, damageEnd: 2.65, defenseStart: 1.15, defenseEnd: 1.3 },
  { healthStart: 2.25, healthEnd: 2.7, damageStart: 2.6, damageEnd: 3.05, defenseStart: 1.3, defenseEnd: 1.5 },
  { healthStart: 2.7, healthEnd: 3.4, damageStart: 3, damageEnd: 3.8, defenseStart: 1.5, defenseEnd: 1.75 },
  { healthStart: 3.4, healthEnd: 4.3, damageStart: 3.75, damageEnd: 4.8, defenseStart: 1.75, defenseEnd: 2.1 },
] as const;

/**
 * First Yellow-world curve. It deliberately continues from the end of Blue
 * without reusing Blue indices, so the band can be tuned independently as
 * T5 equipment and systems are introduced.
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
