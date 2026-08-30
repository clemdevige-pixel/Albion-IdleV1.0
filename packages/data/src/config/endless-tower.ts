import { FACTION_CAPE_FACTIONS } from "./faction-cape-balance.js";

export const TOWER_BLOCK_SIZE = 5;
export const TOWER_MAJOR_BOSS_CADENCE = 25;
export const TOWER_TRIAL_FLOOR_COUNT = 25;

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
 *
 * The two normal floors, elite and block boss map directly to the existing
 * faction Dungeon roster. Reinforced deliberately remains unresolved until an
 * authored source is defined; consumers must not silently substitute another
 * encounter or invent a scaling multiplier.
 */
export const TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX = [
  0,
  1,
  null,
  2,
  3,
] as const satisfies readonly (number | null)[];

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

/** Endless generation consumes one complete tier bag per five blocks. */
export const TOWER_ENDLESS_TIER_BAG = TOWER_TIERS;

/**
 * Factions are consumed as a deterministic shuffled bag. A bag refill must
 * enforce the no-immediate-repeat rule against the previous committed block.
 */
export const TOWER_ENDLESS_FACTION_BAG = TOWER_FACTIONS;

export function isTowerMajorBossFloor(floor: number): boolean {
  return Number.isSafeInteger(floor) && floor > 0 && floor % TOWER_MAJOR_BOSS_CADENCE === 0;
}
