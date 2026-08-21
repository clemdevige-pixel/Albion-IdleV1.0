import type { WorldBandId } from "./world-bands.js";

export const SEGMENTS_PER_ZONE = 10;
export const ENCOUNTERS_PER_SEGMENT = 5;
export const ENCOUNTER_DIFFICULTY_GROWTH = 0.025;
export const REWARD_RANKS_PER_ZONE = 5;

export type EnemyDefenseModel = "legacy_flat_magic" | "rank_parity";

export interface BossGateCombatProfile {
  readonly progressionRole: "boss_gate";
  readonly healthMultiplier: number;
  readonly damageMultiplier: number;
  readonly defenseMultiplier: number;
}

export interface ZoneCombatCurve {
  readonly healthStart: number;
  readonly healthEnd: number;
  readonly damageStart: number;
  readonly damageEnd: number;
  readonly defenseStart: number;
  readonly defenseEnd: number;
  readonly defenseModel: EnemyDefenseModel;
  /**
   * Optional pressure override for the final zone boss only.
   *
   * A boss gate is allowed to be a deliberate local difficulty spike. The
   * following zone therefore does not have to exceed this boss envelope; its
   * normal entry curve is compared against normal progression instead.
   */
  readonly bossGate?: BossGateCombatProfile;
}

export const BLUE_WORLD_COMBAT_CURVE = [
  { healthStart: 0.9, healthEnd: 1.08, damageStart: 0.72, damageEnd: 0.98, defenseStart: 0.9, defenseEnd: 0.98, defenseModel: "legacy_flat_magic" },
  { healthStart: 1.15, healthEnd: 1.55, damageStart: 1.18, damageEnd: 1.8, defenseStart: 1.0, defenseEnd: 1.1, defenseModel: "legacy_flat_magic" },
  { healthStart: 1.7, healthEnd: 2.3, damageStart: 2.0, damageEnd: 2.3, defenseStart: 1.15, defenseEnd: 1.3, defenseModel: "legacy_flat_magic" },
  { healthStart: 2.3, healthEnd: 3.02, damageStart: 2.3, damageEnd: 2.5, defenseStart: 1.3, defenseEnd: 1.46, defenseModel: "rank_parity" },
  {
    healthStart: 3.1,
    healthEnd: 3.72,
    damageStart: 2.5,
    damageEnd: 2.5,
    defenseStart: 1.5,
    defenseEnd: 1.5,
    defenseModel: "rank_parity",
    bossGate: { progressionRole: "boss_gate", healthMultiplier: 1.9, damageMultiplier: 1.3, defenseMultiplier: 1 },
  },
] as const;

/**
 * Continuous-segment damage envelope.
 *
 * Later-band entry starts are calibrated from the deepest common autonomous
 * farm point reached by the previous tier at .3. This preserves a real bridge:
 * Tn.3 can enter and slowly farm the next band's starter zone for Tn+1 shards,
 * while the unchanged late edge still forms the new-tier progression wall.
 */
export const YELLOW_WORLD_COMBAT_CURVE = [
  { healthStart: 3.4, healthEnd: 5.34, damageStart: 2.6, damageEnd: 3.19, defenseStart: 1.6, defenseEnd: 2.289, defenseModel: "rank_parity" },
  { healthStart: 4.75, healthEnd: 4.9, damageStart: 2.95, damageEnd: 3.0, defenseStart: 2.3, defenseEnd: 2.35, defenseModel: "rank_parity" },
  { healthStart: 5.25, healthEnd: 5.4, damageStart: 3.05, damageEnd: 3.1, defenseStart: 2.5, defenseEnd: 2.56, defenseModel: "rank_parity" },
  { healthStart: 5.85, healthEnd: 6.5, damageStart: 3.15, damageEnd: 3.25, defenseStart: 2.75, defenseEnd: 3, defenseModel: "rank_parity" },
  {
    healthStart: 6.24,
    healthEnd: 6.5,
    damageStart: 3.12,
    damageEnd: 3.3,
    defenseStart: 2.88,
    defenseEnd: 3,
    defenseModel: "rank_parity",
    bossGate: { progressionRole: "boss_gate", healthMultiplier: 1.1, damageMultiplier: 1.5, defenseMultiplier: 1 },
  },
] as const;

export const ORANGE_WORLD_COMBAT_CURVE = [
  { healthStart: 6.3, healthEnd: 8.03, damageStart: 3.22, damageEnd: 5.18, defenseStart: 2.92, defenseEnd: 3.28, defenseModel: "rank_parity" },
  { healthStart: 7.252, healthEnd: 7.8, damageStart: 3.626, damageEnd: 3.8, defenseStart: 3.234, defenseEnd: 3.42, defenseModel: "rank_parity" },
  { healthStart: 8.1, healthEnd: 8.55, damageStart: 3.85, damageEnd: 3.95, defenseStart: 3.55, defenseEnd: 3.68, defenseModel: "rank_parity" },
  { healthStart: 8.9, healthEnd: 9.45, damageStart: 4.0, damageEnd: 4.1, defenseStart: 3.82, defenseEnd: 3.98, defenseModel: "rank_parity" },
  {
    healthStart: 9.8,
    healthEnd: 10.5,
    damageStart: 4.15,
    damageEnd: 4.3,
    defenseStart: 4.1,
    defenseEnd: 4.35,
    defenseModel: "rank_parity",
    bossGate: { progressionRole: "boss_gate", healthMultiplier: 1.4, damageMultiplier: 1.4, defenseMultiplier: 1 },
  },
] as const;

export const RED_WORLD_COMBAT_CURVE = [
  { healthStart: 9.4, healthEnd: 11.5, damageStart: 4.09, damageEnd: 6.675, defenseStart: 3.96, defenseEnd: 4.65, defenseModel: "rank_parity" },
  { healthStart: 11.9, healthEnd: 12.6, damageStart: 4.5, damageEnd: 4.6, defenseStart: 4.8, defenseEnd: 4.95, defenseModel: "rank_parity" },
  { healthStart: 13.0, healthEnd: 13.8, damageStart: 4.7, damageEnd: 4.85, defenseStart: 5.1, defenseEnd: 5.28, defenseModel: "rank_parity" },
  { healthStart: 14.3, healthEnd: 15.2, damageStart: 4.95, damageEnd: 5.1, defenseStart: 5.45, defenseEnd: 5.65, defenseModel: "rank_parity" },
  {
    healthStart: 15.8,
    healthEnd: 16.8,
    damageStart: 5.15,
    damageEnd: 5.3,
    defenseStart: 5.85,
    defenseEnd: 6.1,
    defenseModel: "rank_parity",
    bossGate: { progressionRole: "boss_gate", healthMultiplier: 1, damageMultiplier: 1.75, defenseMultiplier: 1 },
  },
] as const;

export const BLACK_WORLD_COMBAT_CURVE = [
  { healthStart: 13.75, healthEnd: 18.0, damageStart: 4.84, damageEnd: 11.191, defenseStart: 5.26, defenseEnd: 6.5, defenseModel: "rank_parity" },
  { healthStart: 18.1, healthEnd: 19.0, damageStart: 5.9, damageEnd: 6.05, defenseStart: 6.55, defenseEnd: 6.75, defenseModel: "rank_parity" },
  { healthStart: 19.5, healthEnd: 20.5, damageStart: 10.7625, damageEnd: 11.025, defenseStart: 6.9, defenseEnd: 7.1, defenseModel: "rank_parity" },
  { healthStart: 24.6, healthEnd: 25.8, damageStart: 10.24, damageEnd: 10.48, defenseStart: 7.2, defenseEnd: 7.4, defenseModel: "rank_parity" },
  { healthStart: 32.7, healthEnd: 34.2, damageStart: 12.635, damageEnd: 13.015, defenseStart: 7.5, defenseEnd: 7.7, defenseModel: "rank_parity" },
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
