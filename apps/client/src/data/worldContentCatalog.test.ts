import { describe, expect, it } from "vitest";
import { asZoneDefinitionId } from "@game/gameplay";
import {
  WORLD_ZONE_IDS,
  WORLD_ZONE_IDS_BY_BAND,
  WORLD_ZONE_ORDER,
  ZONE_UNLOCK_DEFINITIONS,
  buildZoneUnlockDefinitions,
  getWorldZonePlacement,
  validateWorldContentCatalog,
} from "./worldContentCatalog";

describe("worldContentCatalog", () => {
  it("keeps every current authored zone fully registered", () => {
    expect(() => validateWorldContentCatalog()).not.toThrow();
  });

  it("derives the flat runtime order from the ordered world bands", () => {
    expect(WORLD_ZONE_ORDER).toEqual([
      ...WORLD_ZONE_IDS_BY_BAND.blue,
      ...WORLD_ZONE_IDS_BY_BAND.yellow,
      ...WORLD_ZONE_IDS_BY_BAND.orange,
      ...WORLD_ZONE_IDS_BY_BAND.red,
      ...WORLD_ZONE_IDS_BY_BAND.black,
    ]);
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.mountain)).toEqual({
      bandId: "blue",
      zoneIndexWithinBand: 4,
      tier: 4,
    });
  });

  it("generates the existing progression chain without special cases", () => {
    expect(ZONE_UNLOCK_DEFINITIONS[0]).toMatchObject({
      zoneDefId: WORLD_ZONE_IDS.forest,
      unlockedByDefault: true,
      conditions: [],
    });
    expect(ZONE_UNLOCK_DEFINITIONS.at(-1)?.conditions).toEqual([
      { type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.steppe },
    ]);
  });

  it("links the first future Yellow zone to the last Blue zone", () => {
    const firstYellowZone = asZoneDefinitionId("zone_yellow_stage_1_t5");
    const definitions = buildZoneUnlockDefinitions([
      ...WORLD_ZONE_IDS_BY_BAND.blue,
      firstYellowZone,
    ]);

    expect(definitions.at(-1)).toEqual({
      zoneDefId: firstYellowZone,
      conditions: [
        { type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.mountain },
      ],
    });
  });
});
