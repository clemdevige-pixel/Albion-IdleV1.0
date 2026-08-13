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
    const blueZoneIds = Object.values(WORLD_ZONE_IDS);

    expect(WORLD_ZONE_IDS_BY_BAND.blue).toEqual(blueZoneIds);
    expect(WORLD_ZONE_ORDER).toEqual(blueZoneIds);
    expect(blueZoneIds.map((zoneDefId) => getWorldZonePlacement(zoneDefId))).toEqual([
      { bandId: "blue", zoneIndexWithinBand: 0, tier: 3 },
      { bandId: "blue", zoneIndexWithinBand: 1, tier: 3 },
      { bandId: "blue", zoneIndexWithinBand: 2, tier: 3 },
      { bandId: "blue", zoneIndexWithinBand: 3, tier: 4 },
      { bandId: "blue", zoneIndexWithinBand: 4, tier: 4 },
    ]);
  });

  it("does not assign planned worlds any accidental Blue content", () => {
    expect(WORLD_ZONE_IDS_BY_BAND.yellow).toEqual([]);
    expect(WORLD_ZONE_IDS_BY_BAND.orange).toEqual([]);
    expect(WORLD_ZONE_IDS_BY_BAND.red).toEqual([]);
    expect(WORLD_ZONE_IDS_BY_BAND.black).toEqual([]);
  });

  it("keeps current Blue Item Power targets and rejects unauthored Yellow targets", () => {
    expect(getZoneRecommendedItemPower(1)).toBe(220);
    expect(getSegmentRecommendedItemPower(5, 10)).toBe(600);
    expect(() => getZoneRecommendedItemPower(1, "yellow")).toThrow(
      /Item Power progression is not authored for world band: yellow/,
    );
  });
});
