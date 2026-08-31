import { FACTION_CAPE_FACTIONS } from "./faction-cape-balance.js";

export const TOWER_BLOCK_SIZE = 5;
export const TOWER_MAJOR_BOSS_CADENCE = 25;
export const TOWER_TRIAL_FLOOR_COUNT = 25;
export const TOWER_POST_25_DIFFICULTY_STEP = 0.01;
export const TOWER_FACTION_RESILIENCE_PERCENT = 40;
export const TOWER_MATCHED_WEAPON_RESILIENCE_IGNORE_PERCENT = 75;

export const TOWER_TIERS = [4, 5, 6, 7, 8] as const;
export type TowerTier = (typeof TOWER_TIERS)[number];

export const TOWER_FACTIONS = FACTION_CAPE_FACTIONS.map((entry) => entry.factionId);
export type TowerFactionId = (typeof FACTION_CAPE_FACTIONS)[number]["factionId"];

export const TOWER_FLOOR_ROLES = [
  "normal",
  "normal",
  "reinforced",
  "elite",
  "block_boss",
] as const;
export type TowerFloorRole = (typeof TOWER_FLOOR_ROLES)[number];

/**
 * Dungeon encounter indexes reused by each position in a Tower block.
 * Reinforced reuses the second normal encounter and applies authored Tower
 * multipliers below; no separate monster roster or runtime special case exists.
 */
export const TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX = [
  0,
  1,
  1,
  2,
  3,
] as const satisfies readonly number[];

/** Temporary V1 tuning for reinforced floors; subject to later content design. */
export const TOWER_REINFORCED_COMBAT_MULTIPLIERS = {
  hp: 1.35,
  damage: 1.15,
  defense: 1.10,
} as const;

/**
 * Canonical Tower Difficulty 0 baseline.
 *
 * Dungeon data stays the source of truth. Tower applies floor-role tuning first,
 * then this single faction x tier baseline multiplier. These values collapse the
 * former normalization + Difficulty 0 calibration layers into one authored table.
 */
export const TOWER_BASELINE_COMBAT_MULTIPLIER = {
  keeper: { 4: 1.2165, 5: 1.1172, 6: 1.07744, 7: 1.1595, 8: 1.1781945 },
  heretic: { 4: 1.02573, 5: 0.8961855, 6: 0.9994236, 7: 1.0869768, 8: 1.1053455 },
  undead: { 4: 1.01385, 5: 0.990927, 6: 1.019745, 7: 1.04845, 8: 1.08882675 },
  morgana: { 4: 1.023945, 5: 1.0105238, 6: 1.017648, 7: 1.0204425, 8: 1.08675 },
} as const satisfies Record<TowerFactionId, Record<TowerTier, number>>;

export interface TowerAuthoredBlockDefinition {
  readonly id: string;
  readonly blockIndex: number;
  readonly floorStart: number;
  readonly floorEnd: number;
  readonly tier: TowerTier;
  readonly factionId: TowerFactionId;
  readonly majorBoss: boolean;
}

/**
 * Authored onboarding sequence for floors 1-25.
 *
 * The first block starts at T8 so the player enters with the gear band most
 * recently used to finish main progression. The following blocks immediately
 * introduce the multi-tier arsenal requirement. All five tiers appear exactly
 * once and faction identity never repeats on adjacent blocks.
 */
export const TOWER_TRIAL_BLOCKS = [
  { id: "tower_trial_01", blockIndex: 0, floorStart: 1, floorEnd: 5, tier: 8, factionId: "keeper", majorBoss: false },
  { id: "tower_trial_02", blockIndex: 1, floorStart: 6, floorEnd: 10, tier: 6, factionId: "heretic", majorBoss: false },
  { id: "tower_trial_03", blockIndex: 2, floorStart: 11, floorEnd: 15, tier: 4, factionId: "undead", majorBoss: false },
  { id: "tower_trial_04", blockIndex: 3, floorStart: 16, floorEnd: 20, tier: 7, factionId: "keeper", majorBoss: false },
  { id: "tower_trial_05", blockIndex: 4, floorStart: 21, floorEnd: 25, tier: 5, factionId: "morgana", majorBoss: true },
] as const satisfies readonly TowerAuthoredBlockDefinition[];

export interface TowerTrialBlockCombatMultipliers {
  readonly hp: number;
  readonly damage: number;
}

/** Trial blocks use the same Difficulty 0 baseline as every later Tower block. */
export const TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS: Readonly<
  Record<string, TowerTrialBlockCombatMultipliers | undefined>
> = {};

/** Endless generation consumes one complete tier bag per five blocks. */
export const TOWER_ENDLESS_TIER_BAG = TOWER_TIERS;

/**
 * Factions are consumed as a deterministic shuffled bag. A bag refill must
 * enforce the no-immediate-repeat rule against the previous committed block.
 */
export const TOWER_ENDLESS_FACTION_BAG = TOWER_FACTIONS;

/**
 * Canonical V1 depth multiplier.
 * Floors 1-25 use Difficulty 0. Each complete five-floor band entered after
 * floor 25 adds +1% to HP, damage and defense.
 */
export function getTowerDepthDifficultyMultiplier(floor: number): number {
  if (!Number.isSafeInteger(floor) || floor <= 0) {
    throw new Error("Tower floor must be a positive safe integer");
  }
  if (floor <= TOWER_TRIAL_FLOOR_COUNT) return 1;

  const postTrialBlock = Math.ceil((floor - TOWER_TRIAL_FLOOR_COUNT) / TOWER_BLOCK_SIZE);
  return 1 + postTrialBlock * TOWER_POST_25_DIFFICULTY_STEP;
}

export function isTowerMajorBossFloor(floor: number): boolean {
  return Number.isSafeInteger(floor) && floor > 0 && floor % TOWER_MAJOR_BOSS_CADENCE === 0;
}
