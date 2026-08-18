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
 * Blue progression contract, calibrated against the live CombatRuntime:
 * - Forest: starter-only discovery, no real friction.
 * - Early Swamp: first meaningful starter wall.
 * - Swamp S2-S6: one or two T3 armor crafts buy a few segments.
 * - Swamp S6-S10: quasi/full T3 consolidation.
 * - Swamp S10: full T3 clearable without potion.
 * - Highlands: T3 -> first T4 transition.
 * - Steppe: full T4.0 / first enchantments; T4.1 should clear S10 with tension.
 * - Mountain: T4.1 -> T4.2; T4.2 clears S10, T4.3 provides comfort.
 */
export const BLUE_WORLD_COMBAT_CURVE = [
  { healthStart: 0.9, healthEnd: 1.08, damageStart: 0.72, damageEnd: 0.98, defenseStart: 0.9, defenseEnd: 0.98 },
  { healthStart: 1.15, healthEnd: 1.55, damageStart: 1.18, damageEnd: 1.8, defenseStart: 1.0, defenseEnd: 1.1 },
  { healthStart: 1.7, healthEnd: 2.3, damageStart: 2.6, damageEnd: 3.0, defenseStart: 1.15, defenseEnd: 1.3 },
  { healthStart: 2.3, healthEnd: 3.02, damageStart: 3.0, damageEnd: 3.18, defenseStart: 1.3, defenseEnd: 1.46 },
  { healthStart: 3.1, healthEnd: 4.0, damageStart: 3.3, damageEnd: 3.5, defenseStart: 1.5, defenseEnd: 1.8 },
] as const;

/**
 * Yellow T5 calibration curve.
 * Final-boss targets are distributed across the T5 ladder:
 * Amberwood T5.0->T5.1, Gloamfen T5.1,
 * Stormwatch T5.1 + potion / T5.2 without,
 * Sunscar T5.2,
 * Ironveil T5.2 + potion / T5.3 as comfort.
 */
export const YELLOW_WORLD_COMBAT_CURVE = [
  { healthStart: 4.3, healthEnd: 4.45, damageStart: 3.55, damageEnd: 3.7, defenseStart: 2.1, defenseEnd: 2.18 },
  { healthStart: 4.75, healthEnd: 4.9, damageStart: 3.9, damageEnd: 4.0, defenseStart: 2.3, defenseEnd: 2.35 },
  { healthStart: 5.25, healthEnd: 5.4, damageStart: 4.3, damageEnd: 4.35, defenseStart: 2.5, defenseEnd: 2.56 },
  { healthStart: 5.85, healthEnd: 6.5, damageStart: 4.7, damageEnd: 5.15, defenseStart: 2.75, defenseEnd: 3 },
  { healthStart: 6.5, healthEnd: 6.5, damageStart: 5.15, damageEnd: 5.15, defenseStart: 3, defenseEnd: 3 },
] as const;

/**
 * Orange T6 authored progression envelope.
 * Runtime-calibrated against the live T6 equipment package.
 * Target contract:
 * - progression spans T6.0 -> T6.3 across the five Orange zones;
 * - the final Orange boss must NOT be a reliable T6.3 clear without a potion;
 * - the expected final clear is T6.3 + healing potion.
 *
 * Ashenpeak intentionally ramps damage more sharply at the end of the zone:
 * the final breakpoint is a sustain check, so healing potions matter without
 * artificially inflating every prior Orange encounter.
 */
export const ORANGE_WORLD_COMBAT_CURVE = [
  { healthStart: 6.8, healthEnd: 7.15, damageStart: 5.35, damageEnd: 5.6, defenseStart: 3.1, defenseEnd: 3.2 },
  { healthStart: 7.4, healthEnd: 7.8, damageStart: 5.8, damageEnd: 6.05, defenseStart: 3.3, defenseEnd: 3.42 },
  { healthStart: 8.1, healthEnd: 8.55, damageStart: 6.25, damageEnd: 6.5, defenseStart: 3.55, defenseEnd: 3.68 },
  { healthStart: 8.9, healthEnd: 9.45, damageStart: 6.75, damageEnd: 7.05, defenseStart: 3.82, defenseEnd: 3.98 },
  { healthStart: 9.8, healthEnd: 10.5, damageStart: 7.3, damageEnd: 8.65, defenseStart: 4.1, defenseEnd: 4.35 },
] as const;

/**
 * Red T7 provisional combat envelope.
 * This exists so the authored Red world is fully representable by the live
 * runtime and UI. It deliberately continues the Orange curve monotonically,
 * but it is NOT the final T7 balance contract; the dedicated T7 runtime sweep
 * will calibrate these values once the complete T7 equipment loop exists.
 */
export const RED_WORLD_COMBAT_CURVE = [
  { healthStart: 10.9, healthEnd: 11.5, damageStart: 8.8, damageEnd: 9.15, defenseStart: 4.5, defenseEnd: 4.65 },
  { healthStart: 11.9, healthEnd: 12.6, damageStart: 9.4, damageEnd: 9.8, defenseStart: 4.8, defenseEnd: 4.95 },
  { healthStart: 13.0, healthEnd: 13.8, damageStart: 10.05, damageEnd: 10.5, defenseStart: 5.1, defenseEnd: 5.28 },
  { healthStart: 14.3, healthEnd: 15.2, damageStart: 10.8, damageEnd: 11.3, defenseStart: 5.45, defenseEnd: 5.65 },
  { healthStart: 15.8, healthEnd: 16.8, damageStart: 11.65, damageEnd: 12.25, defenseStart: 5.85, defenseEnd: 6.1 },
] as const;

/** Backwards-compatible name retained while existing Blue-world tests migrate. */
export const WORLD_ONE_COMBAT_CURVE = BLUE_WORLD_COMBAT_CURVE;

export interface WorldCombatProgressionDefinition {
  readonly curve: readonly ZoneCombatCurve[];
  readonly rewardRankOffset: number;
}

/** Only authored combat bands belong here; planned bands have no fallback. */
export const WORLD_COMBAT_PROGRESSION: Partial<Readonly<Record<WorldBandId, WorldCombatProgressionDefinition>>> = {
  blue: { curve: BLUE_WORLD_COMBAT_CURVE, rewardRankOffset: 0 },
  yellow: { curve: YELLOW_WORLD_COMBAT_CURVE, rewardRankOffset: BLUE_WORLD_COMBAT_CURVE.length * REWARD_RANKS_PER_ZONE },
  orange: { curve: ORANGE_WORLD_COMBAT_CURVE, rewardRankOffset: (BLUE_WORLD_COMBAT_CURVE.length + YELLOW_WORLD_COMBAT_CURVE.length) * REWARD_RANKS_PER_ZONE },
  red: { curve: RED_WORLD_COMBAT_CURVE, rewardRankOffset: (BLUE_WORLD_COMBAT_CURVE.length + YELLOW_WORLD_COMBAT_CURVE.length + ORANGE_WORLD_COMBAT_CURVE.length) * REWARD_RANKS_PER_ZONE },
} as const;

export function getWorldCombatProgression(bandId: WorldBandId): WorldCombatProgressionDefinition {
  const definition = WORLD_COMBAT_PROGRESSION[bandId];
  if (definition === undefined) throw new Error(`Combat progression is not authored for world band: ${bandId}`);
  return definition;
}
