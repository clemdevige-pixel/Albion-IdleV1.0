import { describe, expect, it } from "vitest";
import {
  benchmarkBlueSegment,
  benchmarkSyntheticIdealBlueSegment,
} from "./blueProgressionBenchmark";
import { WORLD_ZONE_IDS } from "./worldContentCatalog";

const T3_STARTERS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const T4_STANDARD = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

describe("Blue progression balance benchmark", () => {
  it("mirrors the live full-heal boundary immediately before encounter five", () => {
    const result = benchmarkBlueSegment({
      weaponItemId: "item_weapon_bow_t4_longbow",
      masteryLevel: 50,
      enchantment: 3,
      zoneDefId: WORLD_ZONE_IDS.forest,
      segmentIndex: 0,
    });

    expect(result.clear).toBe(true);
    expect(result.encounters).toHaveLength(5);
    expect(result.encounters.slice(0, 4).every(({ startedAtFullHealth }) => !startedAtFullHealth)).toBe(true);
    expect(result.encounters[4]?.startedAtFullHealth).toBe(true);
  });

  it("keeps Dark Swamp S10 clearable by the neutral T3 profile once Q progression is mature", () => {
    const result = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 10,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: 9,
    });

    expect(result.clear).toBe(true);
    expect(result.encounters).toHaveLength(5);
    // It remains a progression checkpoint rather than a trivial farm target.
    expect(result.remainingHealthRatio).toBeLessThan(0.35);
  });

  it("uses T4.2 plus Q/W mastery as the Mountain S10 clear contract", () => {
    const result = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 20,
      enchantment: 2,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
    });

    expect(result.clear).toBe(true);
    expect(result.encounters).toHaveLength(5);
    // T4.2 is the minimum progression target, so the neutral profile should
    // clear narrowly rather than have large AFK headroom.
    expect(result.remainingHealthRatio).toBeGreaterThan(0);
    expect(result.remainingHealthRatio).toBeLessThan(0.2);
  });

  it("gives T4.3 materially more Mountain S10 comfort than T4.2", () => {
    const plusTwo = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 20,
      enchantment: 2,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
    });
    const plusThree = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 20,
      enchantment: 3,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
    });

    expect(plusThree.clear).toBe(true);
    expect(plusThree.totalTimeSeconds).toBeLessThan(plusTwo.totalTimeSeconds);
    expect(plusThree.remainingHealthRatio).toBeGreaterThan(plusTwo.remainingHealthRatio + 0.1);
  });
});
