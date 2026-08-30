import { describe, expect, it } from "vitest";
import {
  TOWER_BLOCK_SIZE,
  TOWER_FACTIONS,
  TOWER_FACTION_TIER_COMBAT_MULTIPLIER,
  TOWER_FLOOR_ROLES,
  TOWER_MAJOR_BOSS_CADENCE,
  TOWER_TIERS,
  TOWER_TRIAL_BLOCKS,
  TOWER_TRIAL_FLOOR_COUNT,
  isTowerMajorBossFloor,
} from "../config/endless-tower.js";

describe("Endless Tower authored contract", () => {
  it("uses five-floor blocks with the validated room-role cadence", () => {
    expect(TOWER_BLOCK_SIZE).toBe(5);
    expect(TOWER_FLOOR_ROLES).toEqual(["normal", "normal", "reinforced", "elite", "block_boss"]);
  });

  it("authors floors 1-25 as five deterministic trial blocks", () => {
    expect(TOWER_TRIAL_FLOOR_COUNT).toBe(25);
    expect(TOWER_TRIAL_BLOCKS).toHaveLength(5);
    expect(TOWER_TRIAL_BLOCKS.map((block) => [block.floorStart, block.floorEnd])).toEqual([
      [1, 5],
      [6, 10],
      [11, 15],
      [16, 20],
      [21, 25],
    ]);
  });

  it("uses every T4-T8 tier exactly once during the trial", () => {
    expect([...TOWER_TRIAL_BLOCKS.map((block) => block.tier)].sort((a, b) => a - b)).toEqual([...TOWER_TIERS]);
  });

  it("never repeats the same faction on adjacent trial blocks", () => {
    for (let index = 1; index < TOWER_TRIAL_BLOCKS.length; index += 1) {
      expect(TOWER_TRIAL_BLOCKS[index]?.factionId).not.toBe(TOWER_TRIAL_BLOCKS[index - 1]?.factionId);
    }
  });

  it("keeps Tower faction normalization complete and Keeper as the untouched reference", () => {
    expect(Object.keys(TOWER_FACTION_TIER_COMBAT_MULTIPLIER).sort()).toEqual([...TOWER_FACTIONS].sort());

    for (const tier of TOWER_TIERS) {
      expect(TOWER_FACTION_TIER_COMBAT_MULTIPLIER.keeper[tier]).toBe(1);
      for (const faction of TOWER_FACTIONS) {
        const multiplier = TOWER_FACTION_TIER_COMBAT_MULTIPLIER[faction][tier];
        expect(multiplier).toBeGreaterThan(0);
        expect(multiplier).toBeLessThanOrEqual(1);
      }
    }
  });

  it("promotes every 25th floor to a major boss", () => {
    expect(TOWER_MAJOR_BOSS_CADENCE).toBe(25);
    expect(isTowerMajorBossFloor(5)).toBe(false);
    expect(isTowerMajorBossFloor(25)).toBe(true);
    expect(isTowerMajorBossFloor(50)).toBe(true);
    expect(TOWER_TRIAL_BLOCKS.at(-1)?.majorBoss).toBe(true);
  });
});
