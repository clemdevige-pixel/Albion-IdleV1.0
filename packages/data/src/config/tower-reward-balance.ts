import type { TowerTier } from "./endless-tower.js";
import { DUNGEON_COMPLETION_SILVER_BY_TIER } from "./dungeon-loot-balance.js";

/**
 * Tower V1 reward contract.
 *
 * Tower is a broad endgame challenge, not a replacement for specialized World
 * or Dungeon farming. Per-floor Silver/Fame therefore uses only a fraction of
 * the corresponding end-of-tier World combat reward, while block milestones
 * pay Silver only. Artifact fragments, artifacts, shards and faction runes stay
 * outside this contract so Dungeon retains its dedicated loot identity.
 */
export const TOWER_FLOOR_WORLD_REWARD_PERCENT = 60;
export const TOWER_BLOCK_CHEST_DUNGEON_SILVER_PERCENT = 5;
export const TOWER_FIRST_CLEAR_BLOCK_DUNGEON_SILVER_PERCENT = 10;
export const TOWER_MAJOR_BOSS_FIRST_CLEAR_DUNGEON_SILVER_PERCENT = 20;

function percentageOf(value: number, percent: number): number {
  return Math.max(0, Math.round(value * percent / 100));
}

export interface TowerBlockSilverReward {
  readonly repeatableChestSilver: number;
  readonly firstClearBonusSilver: number;
  readonly majorBossFirstClearBonusSilver: number;
}

export function getTowerBlockSilverReward(tier: TowerTier): TowerBlockSilverReward {
  const dungeonCompletionSilver = DUNGEON_COMPLETION_SILVER_BY_TIER[tier];
  return {
    repeatableChestSilver: percentageOf(
      dungeonCompletionSilver,
      TOWER_BLOCK_CHEST_DUNGEON_SILVER_PERCENT,
    ),
    firstClearBonusSilver: percentageOf(
      dungeonCompletionSilver,
      TOWER_FIRST_CLEAR_BLOCK_DUNGEON_SILVER_PERCENT,
    ),
    majorBossFirstClearBonusSilver: percentageOf(
      dungeonCompletionSilver,
      TOWER_MAJOR_BOSS_FIRST_CLEAR_DUNGEON_SILVER_PERCENT,
    ),
  };
}
