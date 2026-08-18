import { describe, expect, it } from "vitest";
import { asZoneDefinitionId } from "@game/gameplay";
import { BIOME_BY_ZONE, WORLD_ZONE_CONTENT, WORLD_ZONE_IDS, WORLD_ZONE_IDS_BY_BAND, WORLD_ZONE_ORDER, ZONE_DEFINITIONS, ZONE_UNLOCK_DEFINITIONS, buildZoneUnlockDefinitions, getWorldZonePlacement, validateWorldContentCatalog } from "./worldContentCatalog";

describe("worldContentCatalog", () => {
  it("keeps every current authored zone fully registered", () => { expect(() => validateWorldContentCatalog()).not.toThrow(); });
  it("derives runtime definitions, biome assignments and IDs from one authored catalog", () => {
    const authored = Object.entries(WORLD_ZONE_CONTENT); expect(ZONE_DEFINITIONS).toHaveLength(authored.length); expect(BIOME_BY_ZONE.size).toBe(authored.length);
    for (const [key, definition] of authored) {
      expect(WORLD_ZONE_IDS[key as keyof typeof WORLD_ZONE_IDS]).toBe(definition.id);
      expect(ZONE_DEFINITIONS.find(({ id }) => id === definition.id)).toMatchObject({ id: definition.id, name: definition.name, tier: definition.tier, tags: [...definition.tags] });
      expect(BIOME_BY_ZONE.get(definition.id)).toBe(definition.biomeId); expect(WORLD_ZONE_IDS_BY_BAND[definition.bandId]).toContain(definition.id);
    }
  });
  it("derives the flat runtime order from the ordered world bands", () => {
    expect(WORLD_ZONE_ORDER).toEqual([...WORLD_ZONE_IDS_BY_BAND.blue, ...WORLD_ZONE_IDS_BY_BAND.yellow, ...WORLD_ZONE_IDS_BY_BAND.orange, ...WORLD_ZONE_IDS_BY_BAND.red, ...WORLD_ZONE_IDS_BY_BAND.black]);
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.mountain)).toEqual({ bandId: "blue", zoneIndexWithinBand: 4, tier: 4 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.amberwood)).toEqual({ bandId: "yellow", zoneIndexWithinBand: 0, tier: 5 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.cinderwood)).toEqual({ bandId: "orange", zoneIndexWithinBand: 0, tier: 6 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.ashenpeak)).toEqual({ bandId: "orange", zoneIndexWithinBand: 4, tier: 6 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.bloodwood)).toEqual({ bandId: "red", zoneIndexWithinBand: 0, tier: 7 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.doompeak)).toEqual({ bandId: "red", zoneIndexWithinBand: 4, tier: 7 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.blackwood)).toEqual({ bandId: "black", zoneIndexWithinBand: 0, tier: 8 });
    expect(getWorldZonePlacement(WORLD_ZONE_IDS.blackspire)).toEqual({ bandId: "black", zoneIndexWithinBand: 4, tier: 8 });
  });
  it("generates the complete authored progression chain without special cases", () => {
    expect(ZONE_UNLOCK_DEFINITIONS[0]).toMatchObject({ zoneDefId: WORLD_ZONE_IDS.forest, unlockedByDefault: true, conditions: [] });
    expect(ZONE_UNLOCK_DEFINITIONS.at(-1)?.zoneDefId).toBe(WORLD_ZONE_IDS.blackspire);
    expect(ZONE_UNLOCK_DEFINITIONS.at(-1)?.conditions).toEqual([{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.duskfallSteppe }]);
  });
  it("links a future band generically to the previous authored zone", () => {
    const futureZone = asZoneDefinitionId("zone_future_stage_1_t9"); const definitions = buildZoneUnlockDefinitions([...WORLD_ZONE_ORDER, futureZone]);
    expect(definitions.at(-1)).toEqual({ zoneDefId: futureZone, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.blackspire }] });
  });
  it("links Yellow, Orange, Red and Black without special cases", () => {
    const firstYellowIndex = ZONE_UNLOCK_DEFINITIONS.findIndex(({ zoneDefId }) => zoneDefId === WORLD_ZONE_IDS.amberwood);
    expect(ZONE_UNLOCK_DEFINITIONS[firstYellowIndex]).toEqual({ zoneDefId: WORLD_ZONE_IDS.amberwood, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.mountain }] });
    const firstOrangeIndex = ZONE_UNLOCK_DEFINITIONS.findIndex(({ zoneDefId }) => zoneDefId === WORLD_ZONE_IDS.cinderwood);
    expect(ZONE_UNLOCK_DEFINITIONS[firstOrangeIndex]).toEqual({ zoneDefId: WORLD_ZONE_IDS.cinderwood, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.ironveil }] });
    const firstRedIndex = ZONE_UNLOCK_DEFINITIONS.findIndex(({ zoneDefId }) => zoneDefId === WORLD_ZONE_IDS.bloodwood);
    expect(ZONE_UNLOCK_DEFINITIONS[firstRedIndex]).toEqual({ zoneDefId: WORLD_ZONE_IDS.bloodwood, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.ashenpeak }] });
    const firstBlackIndex = ZONE_UNLOCK_DEFINITIONS.findIndex(({ zoneDefId }) => zoneDefId === WORLD_ZONE_IDS.blackwood);
    expect(ZONE_UNLOCK_DEFINITIONS[firstBlackIndex]).toEqual({ zoneDefId: WORLD_ZONE_IDS.blackwood, conditions: [{ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.doompeak }] });
  });
});
