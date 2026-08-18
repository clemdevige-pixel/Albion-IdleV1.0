import { describe, expect, it } from "vitest";
import {
  WORLD_ZONE_IDS,
  WORLD_ZONE_IDS_BY_BAND,
  WORLD_ZONE_ORDER,
  getWorldZonePlacement,
} from "./worldContentCatalog";
import {
  getEffectiveItemPower,
  getSegmentRecommendedItemPower,
  getZoneRecommendedItemPower,
  type MasteryLevel,
} from "./itemPower";

describe("world progression foundation", () => {
  it("keeps every existing zone in the Blue world and in its original order", () => {
    const blueZoneIds = [
      WORLD_ZONE_IDS.forest,
      WORLD_ZONE_IDS.swamp,
      WORLD_ZONE_IDS.highland,
      WORLD_ZONE_IDS.steppe,
      WORLD_ZONE_IDS.mountain,
    ];

    expect(WORLD_ZONE_IDS_BY_BAND.blue).toEqual(blueZoneIds);
    expect(WORLD_ZONE_ORDER.slice(0, blueZoneIds.length)).toEqual(blueZoneIds);
    expect(blueZoneIds.map((zoneDefId) => getWorldZonePlacement(zoneDefId))).toEqual([
      { bandId: "blue", zoneIndexWithinBand: 0, tier: 3 },
      { bandId: "blue", zoneIndexWithinBand: 1, tier: 3 },
      { bandId: "blue", zoneIndexWithinBand: 2, tier: 3 },
      { bandId: "blue", zoneIndexWithinBand: 3, tier: 4 },
      { bandId: "blue", zoneIndexWithinBand: 4, tier: 4 },
    ]);
  });

  it("registers the authored Yellow and Orange worlds without populating later worlds", () => {
    expect(WORLD_ZONE_IDS_BY_BAND.yellow).toEqual([
      WORLD_ZONE_IDS.amberwood,
      WORLD_ZONE_IDS.gloamfen,
      WORLD_ZONE_IDS.stormwatch,
      WORLD_ZONE_IDS.sunscar,
      WORLD_ZONE_IDS.ironveil,
    ]);
    expect(WORLD_ZONE_IDS_BY_BAND.orange).toEqual([
      WORLD_ZONE_IDS.cinderwood,
      WORLD_ZONE_IDS.rotfen,
      WORLD_ZONE_IDS.thundercrag,
      WORLD_ZONE_IDS.emberwind,
      WORLD_ZONE_IDS.ashenpeak,
    ]);
    expect(WORLD_ZONE_IDS_BY_BAND.red).toEqual([]);
    expect(WORLD_ZONE_IDS_BY_BAND.black).toEqual([]);
  });

  it("keeps the validated Blue progression inside its equipment checkpoints", () => {
    const t3 = 300;
    const t4 = 400;
    const t4PlusTwo = 500;
    const t4PlusThree = 550;

    expect(getZoneRecommendedItemPower(1)).toBe(t3);

    const darkSwampEnd = getSegmentRecommendedItemPower(2, 10);
    expect(darkSwampEnd).toBeGreaterThanOrEqual(t3);
    expect(darkSwampEnd).toBeLessThan(t4);

    const mountainEnd = getSegmentRecommendedItemPower(5, 10);
    expect(mountainEnd).toBeGreaterThanOrEqual(t4PlusTwo);
    expect(mountainEnd).toBeLessThan(t4PlusThree);
  });

  it("keeps enchantment IP milestones coherent with +50 IP per level", () => {
    const noMastery: readonly MasteryLevel[] = [];

    expect(getEffectiveItemPower("item_weapon_sword_t3_broadsword", noMastery, 0)).toBe(300);
    expect(getEffectiveItemPower("item_weapon_sword_t4_broadsword", noMastery, 0)).toBe(400);
    expect(getEffectiveItemPower("item_weapon_sword_t4_broadsword", noMastery, 1)).toBe(450);
    expect(getEffectiveItemPower("item_weapon_sword_t4_broadsword", noMastery, 2)).toBe(500);
    expect(getEffectiveItemPower("item_weapon_sword_t4_broadsword", noMastery, 3)).toBe(550);
    expect(getEffectiveItemPower("item_weapon_sword_t5_broadsword", noMastery, 0)).toBe(500);
    expect(getEffectiveItemPower("item_weapon_sword_t5_broadsword", noMastery, 3)).toBe(650);
  });

  it("keeps every provisional Yellow recommendation monotonic", () => {
    let previous = getZoneRecommendedItemPower(1, "yellow");

    for (let zoneIndex = 1; zoneIndex <= 5; zoneIndex += 1) {
      for (let segmentIndex = 1; segmentIndex <= 10; segmentIndex += 1) {
        const current = getSegmentRecommendedItemPower(
          zoneIndex,
          segmentIndex,
          "yellow",
        );
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });
});
