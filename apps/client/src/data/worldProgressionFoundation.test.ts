import { describe, expect, it } from "vitest";
import {
  WORLD_ZONE_IDS,
  WORLD_ZONE_IDS_BY_BAND,
  WORLD_ZONE_ORDER,
  getWorldZonePlacement,
} from "./worldContentCatalog";
import {
  getSegmentRecommendedItemPower,
  getZoneRecommendedItemPower,
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

  it("registers the authored Yellow world without populating planned worlds", () => {
    expect(WORLD_ZONE_IDS_BY_BAND.yellow).toEqual([
      WORLD_ZONE_IDS.amberwood,
      WORLD_ZONE_IDS.gloamfen,
      WORLD_ZONE_IDS.stormwatch,
      WORLD_ZONE_IDS.sunscar,
      WORLD_ZONE_IDS.ironveil,
    ]);
    expect(WORLD_ZONE_IDS_BY_BAND.orange).toEqual([]);
    expect(WORLD_ZONE_IDS_BY_BAND.red).toEqual([]);
    expect(WORLD_ZONE_IDS_BY_BAND.black).toEqual([]);
  });

  it("keeps Blue targets and authors an independent Yellow Item Power curve", () => {
    expect(getZoneRecommendedItemPower(1)).toBe(220);
    expect(getSegmentRecommendedItemPower(5, 10)).toBe(600);
    expect(getZoneRecommendedItemPower(1, "yellow")).toBe(600);
    expect(getSegmentRecommendedItemPower(5, 10, "yellow")).toBe(1000);
  });
});
