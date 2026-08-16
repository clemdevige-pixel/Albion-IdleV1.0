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
  // Preserve Steppe's T4.0 early/mid consolidation while easing only the interpolated late-zone endpoint.
  { healthStart: 2.3, healthEnd: 3.02, damageStart: 3.0, damageEnd: 3.18, defenseStart: 1.3, defenseEnd: 1.46 },
  { healthStart: 3.1, healthEnd: 4.0, damageStart: 3.3, damageEnd: 3.5, defenseStart: 1.5, defenseEnd: 1.8 },
] as const;

/**
 * Yellow T5 calibration curve.
 * Zone starts preserve the validated early-zone difficulty from the first pass.
 * Final-boss targets are intentionally distributed across the T5 ladder:
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
  // Ironveil starts at Sunscar's endpoint and must never become easier as segments advance.
  // Keep the authored boundary flat until a future zone-wide balance pass gives it a new upward slope.
  { healthStart: 6.5, healthEnd: 6.5, damageStart: 5.15, damageEnd: 5.15, defenseStart: 3, defenseEnd: 3 },
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
export const WORLD_COMBAT_PROGRESSION: Partial<Readonly<Record<WorldBandId, WorldCombatProgressionDefinition>>> = {
  blue: { curve: BLUE_WORLD_COMBAT_CURVE, rewardRankOffset: 0 },
  yellow: { curve: YELLOW_WORLD_COMBAT_CURVE, rewardRankOffset: BLUE_WORLD_COMBAT_CURVE.length * REWARD_RANKS_PER_ZONE },
} as const;

export function getWorldCombatProgression(bandId: WorldBandId): WorldCombatProgressionDefinition {
  const definition = WORLD_COMBAT_PROGRESSION[bandId];
  if (definition === undefined) throw new Error(`Combat progression is not authored for world band: ${bandId}`);
  return definition;
}
