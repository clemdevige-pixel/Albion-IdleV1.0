import type { WorldBandId } from "./world-bands.js";

export const SEGMENTS_PER_ZONE = 10;
export const ENCOUNTERS_PER_SEGMENT = 5;
export const ENCOUNTER_DIFFICULTY_GROWTH = 0.025;
export const REWARD_RANKS_PER_ZONE = 5;

export type EnemyDefenseModel = "legacy_flat_magic" | "rank_parity";

export interface ZoneCombatCurve {
  readonly healthStart: number;
  readonly healthEnd: number;
  readonly damageStart: number;
  readonly damageEnd: number;
  readonly defenseStart: number;
  readonly defenseEnd: number;
  readonly defenseModel: EnemyDefenseModel;
}

export const BLUE_WORLD_COMBAT_CURVE = [
  { healthStart: 0.9, healthEnd: 1.08, damageStart: 0.72, damageEnd: 0.98, defenseStart: 0.9, defenseEnd: 0.98, defenseModel: "legacy_flat_magic" },
  { healthStart: 1.15, healthEnd: 1.55, damageStart: 1.18, damageEnd: 1.8, defenseStart: 1.0, defenseEnd: 1.1, defenseModel: "legacy_flat_magic" },
  { healthStart: 1.7, healthEnd: 2.3, damageStart: 2.0, damageEnd: 2.3, defenseStart: 1.15, defenseEnd: 1.3, defenseModel: "legacy_flat_magic" },
  { healthStart: 2.3, healthEnd: 3.02, damageStart: 2.3, damageEnd: 2.5, defenseStart: 1.3, defenseEnd: 1.46, defenseModel: "rank_parity" },
  { healthStart: 3.1, healthEnd: 4.0, damageStart: 2.5, damageEnd: 2.8, defenseStart: 1.5, defenseEnd: 1.8, defenseModel: "rank_parity" },
] as const;

/**
 * Post-continuous-segment first pass.
 * Damage is deliberately re-anchored from the validated late-Blue envelope so
 * later bands preserve a monotone world while the exhaustive runtime sweep
 * locates the new walls. HP and defense stay untouched for this pass so the
 * signal remains focused on cumulative survivability after removing the E5 heal.
 */
export const YELLOW_WORLD_COMBAT_CURVE = [
  { healthStart: 4.3, healthEnd: 4.45, damageStart: 2.9, damageEnd: 3.0, defenseStart: 2.1, defenseEnd: 2.18, defenseModel: "rank_parity" },
  { healthStart: 4.75, healthEnd: 4.9, damageStart: 3.1, damageEnd: 3.2, defenseStart: 2.3, defenseEnd: 2.35, defenseModel: "rank_parity" },
  { healthStart: 5.25, healthEnd: 5.4, damageStart: 3.3, damageEnd: 3.4, defenseStart: 2.5, defenseEnd: 2.56, defenseModel: "rank_parity" },
  { healthStart: 5.85, healthEnd: 6.5, damageStart: 3.5, damageEnd: 3.7, defenseStart: 2.75, defenseEnd: 3, defenseModel: "rank_parity" },
  { healthStart: 6.5, healthEnd: 6.5, damageStart: 3.7, damageEnd: 3.7, defenseStart: 3, defenseEnd: 3, defenseModel: "rank_parity" },
] as const;

export const ORANGE_WORLD_COMBAT_CURVE = [
  { healthStart: 6.8, healthEnd: 7.15, damageStart: 3.8, damageEnd: 3.95, defenseStart: 3.1, defenseEnd: 3.2, defenseModel: "rank_parity" },
  { healthStart: 7.4, healthEnd: 7.8, damageStart: 4.05, damageEnd: 4.2, defenseStart: 3.3, defenseEnd: 3.42, defenseModel: "rank_parity" },
  { healthStart: 8.1, healthEnd: 8.55, damageStart: 4.3, damageEnd: 4.45, defenseStart: 3.55, defenseEnd: 3.68, defenseModel: "rank_parity" },
  { healthStart: 8.9, healthEnd: 9.45, damageStart: 4.55, damageEnd: 4.75, defenseStart: 3.82, defenseEnd: 3.98, defenseModel: "rank_parity" },
  { healthStart: 9.8, healthEnd: 10.5, damageStart: 4.85, damageEnd: 5.15, defenseStart: 4.1, defenseEnd: 4.35, defenseModel: "rank_parity" },
] as const;

export const RED_WORLD_COMBAT_CURVE = [
  { healthStart: 10.9, healthEnd: 11.5, damageStart: 5.25, damageEnd: 5.45, defenseStart: 4.5, defenseEnd: 4.65, defenseModel: "rank_parity" },
  { healthStart: 11.9, healthEnd: 12.6, damageStart: 5.55, damageEnd: 5.75, defenseStart: 4.8, defenseEnd: 4.95, defenseModel: "rank_parity" },
  { healthStart: 13.0, healthEnd: 13.8, damageStart: 5.85, damageEnd: 6.05, defenseStart: 5.1, defenseEnd: 5.28, defenseModel: "rank_parity" },
  { healthStart: 14.3, healthEnd: 15.2, damageStart: 6.15, damageEnd: 6.4, defenseStart: 5.45, defenseEnd: 5.65, defenseModel: "rank_parity" },
  { healthStart: 15.8, healthEnd: 16.8, damageStart: 6.5, damageEnd: 6.8, defenseStart: 5.85, defenseEnd: 6.1, defenseModel: "rank_parity" },
] as const;

/**
 * Provisional T8 envelope.
 *
 * This is intentionally only a minimal playable bridge from Red/T7 into
 * Black/T8. The global T4-T8 balance pass will revisit these values once the
 * remaining progression systems are represented in the runtime benchmarks.
 * Keep the curve authored here rather than compensating per weapon or zone.
 */
export const BLACK_WORLD_COMBAT_CURVE = [
  { healthStart: 16.9, healthEnd: 17.7, damageStart: 6.9, damageEnd: 7.1, defenseStart: 6.2, defenseEnd: 6.4, defenseModel: "rank_parity" },
  { healthStart: 18.1, healthEnd: 19.0, damageStart: 7.2, damageEnd: 7.4, defenseStart: 6.55, defenseEnd: 6.75, defenseModel: "rank_parity" },
  { healthStart: 19.5, healthEnd: 20.5, damageStart: 7.5, damageEnd: 7.75, defenseStart: 6.9, defenseEnd: 7.1, defenseModel: "rank_parity" },
  { healthStart: 20.5, healthEnd: 21.5, damageStart: 7.85, damageEnd: 8.1, defenseStart: 7.2, defenseEnd: 7.4, defenseModel: "rank_parity" },
  { healthStart: 21.8, healthEnd: 22.8, damageStart: 8.2, damageEnd: 8.5, defenseStart: 7.5, defenseEnd: 7.7, defenseModel: "rank_parity" },
] as const;

export const WORLD_ONE_COMBAT_CURVE = BLUE_WORLD_COMBAT_CURVE;

export interface WorldCombatProgressionDefinition {
  readonly curve: readonly ZoneCombatCurve[];
  readonly rewardRankOffset: number;
}

export const WORLD_COMBAT_PROGRESSION: Partial<Readonly<Record<WorldBandId, WorldCombatProgressionDefinition>>> = {
  blue: { curve: BLUE_WORLD_COMBAT_CURVE, rewardRankOffset: 0 },
  yellow: { curve: YELLOW_WORLD_COMBAT_CURVE, rewardRankOffset: BLUE_WORLD_COMBAT_CURVE.length * REWARD_RANKS_PER_ZONE },
  orange: { curve: ORANGE_WORLD_COMBAT_CURVE, rewardRankOffset: (BLUE_WORLD_COMBAT_CURVE.length + YELLOW_WORLD_COMBAT_CURVE.length) * REWARD_RANKS_PER_ZONE },
  red: { curve: RED_WORLD_COMBAT_CURVE, rewardRankOffset: (BLUE_WORLD_COMBAT_CURVE.length + YELLOW_WORLD_COMBAT_CURVE.length + ORANGE_WORLD_COMBAT_CURVE.length) * REWARD_RANKS_PER_ZONE },
  black: { curve: BLACK_WORLD_COMBAT_CURVE, rewardRankOffset: (BLUE_WORLD_COMBAT_CURVE.length + YELLOW_WORLD_COMBAT_CURVE.length + ORANGE_WORLD_COMBAT_CURVE.length + RED_WORLD_COMBAT_CURVE.length) * REWARD_RANKS_PER_ZONE },
} as const;

export function getWorldCombatProgression(bandId: WorldBandId): WorldCombatProgressionDefinition {
  const definition = WORLD_COMBAT_PROGRESSION[bandId];
  if (definition === undefined) throw new Error(`Combat progression is not authored for world band: ${bandId}`);
  return definition;
}
