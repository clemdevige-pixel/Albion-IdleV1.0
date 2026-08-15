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
 * Blue progression is calibrated around the validated vertical-slice contract:
 * - T3.0 carries the early game and can clear Dark Swamp with natural mastery.
 * - T4 progression starts after that checkpoint.
 * - Mountain S10 must be clearable around T4.2 with natural Q/W mastery.
 * - T4.3 is comfort / reliable AFK headroom, not a progression requirement.
 *
 * The previous curve predated the +50 IP/enchantment rebalance and scaled
 * incoming damage much faster than the player's defensive envelope. Health is
 * still allowed to grow meaningfully so late encounters take longer, while
 * damage and defense use a substantially flatter curve.
 */
export const BLUE_WORLD_COMBAT_CURVE = [
  { healthStart: 0.9, healthEnd: 1.1, damageStart: 0.75, damageEnd: 0.85, defenseStart: 0.9, defenseEnd: 1.0 },
  { healthStart: 1.1, healthEnd: 1.35, damageStart: 0.85, damageEnd: 0.95, defenseStart: 1.0, defenseEnd: 1.1 },
  { healthStart: 1.35, healthEnd: 1.75, damageStart: 0.95, damageEnd: 1.1, defenseStart: 1.1, defenseEnd: 1.25 },
  { healthStart: 1.75, healthEnd: 2.35, damageStart: 1.1, damageEnd: 1.3, defenseStart: 1.25, defenseEnd: 1.45 },
  { healthStart: 2.35, healthEnd: 3.4, damageStart: 1.3, damageEnd: 1.6, defenseStart: 1.45, defenseEnd: 1.7 },
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
