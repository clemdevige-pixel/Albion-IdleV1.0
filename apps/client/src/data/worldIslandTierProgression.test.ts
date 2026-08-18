import { describe, expect, it } from "vitest";
import { getIslandLevelDefinition } from "@game/data";
import { WORLD_ZONE_IDS, ZONE_UNLOCK_DEFINITIONS } from "./worldContentCatalog.js";

describe("world/island tier progression", () => {
  it("opens island level 2 after Dark Swamp completion", () => {
    expect(getIslandLevelDefinition(2)?.worldRequirementToReach).toEqual({ zoneDefId: WORLD_ZONE_IDS.swamp, minimumCompletedSegments: 10, label: "Terminer Dark Swamp" });
  });

  it("uses Frostpeak completion for both Yellow access and island level 3", () => {
    const amberwoodUnlock = ZONE_UNLOCK_DEFINITIONS.find((definition) => definition.zoneDefId === WORLD_ZONE_IDS.amberwood);
    expect(amberwoodUnlock?.conditions).toContainEqual({ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.mountain });
    expect(getIslandLevelDefinition(3)?.worldRequirementToReach).toEqual({ zoneDefId: WORLD_ZONE_IDS.mountain, minimumCompletedSegments: 10, label: "Terminer Frostpeak Mountain" });
  });

  it("uses Ironveil completion for both Orange access and island level 4", () => {
    const cinderwoodUnlock = ZONE_UNLOCK_DEFINITIONS.find((definition) => definition.zoneDefId === WORLD_ZONE_IDS.cinderwood);
    expect(cinderwoodUnlock?.conditions).toContainEqual({ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.ironveil });
    expect(getIslandLevelDefinition(4)?.worldRequirementToReach).toEqual({ zoneDefId: WORLD_ZONE_IDS.ironveil, minimumCompletedSegments: 10, label: "Terminer Ironveil Peaks" });
  });

  it("uses Ashenpeak completion for both Red access and island level 5", () => {
    const bloodwoodUnlock = ZONE_UNLOCK_DEFINITIONS.find((definition) => definition.zoneDefId === WORLD_ZONE_IDS.bloodwood);
    expect(bloodwoodUnlock?.conditions).toContainEqual({ type: "zone_completed", targetZoneDefId: WORLD_ZONE_IDS.ashenpeak });
    expect(getIslandLevelDefinition(5)?.worldRequirementToReach).toEqual({ zoneDefId: WORLD_ZONE_IDS.ashenpeak, minimumCompletedSegments: 10, label: "Terminer Ashenpeak Mountain" });
    expect(getIslandLevelDefinition(5)?.maxBuildingLevel).toBe(5);
  });
});
