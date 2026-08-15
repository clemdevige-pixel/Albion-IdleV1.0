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

  it("keeps Forest comfortable for natural T3 progression without potions", () => {
    const result = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 4,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.forest,
      segmentIndex: 9,
      useHealthPotions: false,
    });

    expect(result.clear).toBe(true);
    expect(result.remainingHealthRatio).toBeGreaterThan(0.25);
    expect(result.potionsUsed).toBe(0);
  });

  it("starts the T3 to T4 pressure in mid Dark Swamp", () => {
    const midWithoutPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 7,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: 5,
      useHealthPotions: false,
    });
    const midWithPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 7,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: 5,
      useHealthPotions: true,
    });

    expect(midWithPotion.clear).toBe(true);
    expect(midWithPotion.remainingHealthRatio).toBeGreaterThan(midWithoutPotion.remainingHealthRatio);
  });

  it("makes Dark Swamp S10 the last difficult T3 checkpoint with potion support", () => {
    const withoutPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 10,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: 9,
      useHealthPotions: false,
    });
    const withPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 10,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: 9,
      useHealthPotions: true,
    });
    const t4WithoutPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 10,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: 9,
      useHealthPotions: false,
    });

    expect(withoutPotion.clear).toBe(false);
    expect(withPotion.clear).toBe(true);
    expect(withPotion.potionsUsed).toBeGreaterThan(0);
    expect(t4WithoutPotion.clear).toBe(true);
    expect(t4WithoutPotion.remainingHealthRatio).toBeGreaterThan(withPotion.remainingHealthRatio);
  });

  it("treats T4.0 as the intended Highland baseline rather than extending T3 progression", () => {
    const t3WithPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T3_STARTERS,
      masteryLevel: 10,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.highland,
      segmentIndex: 5,
      useHealthPotions: true,
    });
    const t4WithoutPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 10,
      enchantment: 0,
      zoneDefId: WORLD_ZONE_IDS.highland,
      segmentIndex: 5,
      useHealthPotions: false,
    });

    expect(t4WithoutPotion.clear).toBe(true);
    expect(t4WithoutPotion.remainingHealthRatio).toBeGreaterThan(t3WithPotion.remainingHealthRatio);
  });

  it("makes Mountain S10 a difficult T4.2 clear with potion support", () => {
    const withoutPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 20,
      enchantment: 2,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      useHealthPotions: false,
    });
    const withPotion = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 20,
      enchantment: 2,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      useHealthPotions: true,
    });

    expect(withoutPotion.clear).toBe(false);
    expect(withPotion.clear).toBe(true);
    expect(withPotion.potionsUsed).toBeGreaterThan(0);
  });

  it("turns T4.3 into a no-potion comfort/farm profile on Mountain S10", () => {
    const result = benchmarkSyntheticIdealBlueSegment({
      weaponItemIds: T4_STANDARD,
      masteryLevel: 20,
      enchantment: 3,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      useHealthPotions: false,
    });

    expect(result.clear).toBe(true);
    expect(result.remainingHealthRatio).toBeGreaterThan(0.15);
    expect(result.potionsUsed).toBe(0);
  });
});
