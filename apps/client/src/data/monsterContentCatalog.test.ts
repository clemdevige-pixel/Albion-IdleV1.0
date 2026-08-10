import { describe, expect, it } from "vitest";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import { asZoneDefinitionId } from "@game/gameplay";
import {
  MONSTER_DEFINITIONS,
  ZONE_ENCOUNTER_POOLS,
  getMonsterDefinition,
  resolveMonsterForEncounter,
} from "./monsterContentCatalog";

describe("monsterContentCatalog", () => {
  it("keeps every encounter-pool reference resolvable", () => {
    for (const pool of Object.values(ZONE_ENCOUNTER_POOLS)) {
      for (const monsterId of [...pool.normal, pool.segmentBoss, pool.biomeBoss]) {
        expect(getMonsterDefinition(monsterId).id).toBe(monsterId);
      }
    }
  });

  it("keeps definition IDs coherent with their catalog keys", () => {
    for (const [key, definition] of Object.entries(MONSTER_DEFINITIONS)) {
      expect(definition.id).toBe(key);
      expect(definition.visualManifestId.length).toBeGreaterThan(0);
      expect(definition.combat.attackSpeed).toBeGreaterThan(0);
    }
  });

  it("selects normal encounters from the zone pool deterministically", () => {
    const zone = asZoneDefinitionId("zone_forest_t3");
    const first = resolveMonsterForEncounter(zone, 0, 0, () => 0);
    const last = resolveMonsterForEncounter(zone, 0, 0, () => 0.999);
    expect(first.category).toBe("normal");
    expect(last.category).toBe("normal");
    expect(first.id).not.toBe(last.id);
  });

  it("selects segment and biome bosses from explicit pool slots", () => {
    const zone = asZoneDefinitionId("zone_swamp_t3");
    const segmentBoss = resolveMonsterForEncounter(
      zone,
      0,
      ENCOUNTERS_PER_SEGMENT - 1,
    );
    const biomeBoss = resolveMonsterForEncounter(
      zone,
      SEGMENTS_PER_ZONE - 1,
      ENCOUNTERS_PER_SEGMENT - 1,
    );
    expect(segmentBoss.tags).toContain("segment_boss");
    expect(biomeBoss.tags).toContain("biome_boss");
  });

  it("has an explicit encounter pool for every current world zone", () => {
    expect(Object.keys(ZONE_ENCOUNTER_POOLS).sort()).toEqual([
      "zone_forest_t3",
      "zone_highland_t3",
      "zone_mountain_t4",
      "zone_steppe_t4",
      "zone_swamp_t3",
    ]);
  });
});
