import { describe, expect, it } from "vitest";
import {
  ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS,
  ENCHANTMENT_RECIPE_STEPS,
  ENCHANTMENT_RESOURCE_TIERS,
  ENCHANTMENT_SHARD_COSTS,
  GATHERING_MASTERY_UNLOCK_BY_TIER,
  HERO_GATHERING_XP_BY_TIER,
  ITEM_POWER_BY_TIER,
  WORLD_BAND_IDS,
  WORLD_ITEM_POWER_PROGRESSION,
  WORKER_GATHERING_XP_BY_TIER,
} from "../index.js";

const EXPECTED_PRODUCTION_TIERS = [3, 4, 5, 6, 7, 8];

function numericKeys(record: Readonly<Record<number, unknown>>): number[] {
  return Object.keys(record).map(Number).sort((a, b) => a - b);
}

function expectStrictlyIncreasing(values: readonly number[]): void {
  for (let index = 1; index < values.length; index += 1) {
    expect(values[index]).toBeGreaterThan(values[index - 1]);
  }
}

describe("canonical authored balance contracts", () => {
  it("keeps enchantment transitions contiguous and preserves the validated shard costs", () => {
    expect(ENCHANTMENT_RESOURCE_TIERS).toEqual([4, 5, 6, 7, 8]);
    expect(ENCHANTMENT_SHARD_COSTS).toEqual({ 1: 10, 2: 30, 3: 60, 4: 100 });
    expect(ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS).toEqual({ 1: 1, 2: 2, 3: 4, 4: 8 });

    for (const level of [1, 2, 3, 4] as const) {
      const step = ENCHANTMENT_RECIPE_STEPS[level];
      expect(step.enabled).toBe(true);
      expect(step.fromLevel).toBe(level - 1);
      expect(step.toLevel).toBe(level);
    }
  });

  it("keeps authored T3-T8 progression tables complete and increasing", () => {
    expect(numericKeys(ITEM_POWER_BY_TIER)).toEqual(EXPECTED_PRODUCTION_TIERS);
    expect(numericKeys(GATHERING_MASTERY_UNLOCK_BY_TIER)).toEqual(EXPECTED_PRODUCTION_TIERS);
    expect(numericKeys(HERO_GATHERING_XP_BY_TIER)).toEqual(EXPECTED_PRODUCTION_TIERS);
    expect(numericKeys(WORKER_GATHERING_XP_BY_TIER)).toEqual(EXPECTED_PRODUCTION_TIERS);

    expectStrictlyIncreasing(Object.values(ITEM_POWER_BY_TIER));
    expectStrictlyIncreasing(Object.values(GATHERING_MASTERY_UNLOCK_BY_TIER));
    expectStrictlyIncreasing(Object.values(HERO_GATHERING_XP_BY_TIER));
    expectStrictlyIncreasing(Object.values(WORKER_GATHERING_XP_BY_TIER));
  });

  it("keeps world item-power bands internally contiguous and connected", () => {
    let previousBandEnd: number | undefined;

    for (const bandId of WORLD_BAND_IDS) {
      const progression = WORLD_ITEM_POWER_PROGRESSION[bandId];
      expect(progression.zoneStart).toHaveLength(5);
      expect(progression.zoneEnd).toHaveLength(5);

      if (previousBandEnd !== undefined) {
        expect(progression.zoneStart[0]).toBe(previousBandEnd);
      }

      for (let index = 0; index < progression.zoneStart.length; index += 1) {
        expect(progression.zoneEnd[index]).toBeGreaterThan(progression.zoneStart[index]);
        if (index > 0) {
          expect(progression.zoneStart[index]).toBe(progression.zoneEnd[index - 1]);
        }
      }

      previousBandEnd = progression.zoneEnd.at(-1);
    }
  });
});
