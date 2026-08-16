import { describe, expect, it } from "vitest";
import type { WorldLocationSaveState } from "@game/gameplay";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog";
import { createWorldFoundation } from "./bootstrap/createWorldFoundation";

function unlockFirstYellowZone(foundation: ReturnType<typeof createWorldFoundation>): void {
  for (let index = 0; index < 5; index += 1) {
    foundation.progressionManager.markCompleted(foundation.zoneOrder[index]!);
  }
  expect(foundation.progressionManager.isUnlocked(WORLD_ZONE_IDS.amberwood)).toBe(true);
}

describe("WorldRuntime Yellow parity", () => {
  it("restores and re-saves Yellow location, encounter and farm mode without Blue-specific fallback", () => {
    const foundation = createWorldFoundation();
    unlockFirstYellowZone(foundation);

    const savedLocation: WorldLocationSaveState = {
      activeZoneDefId: WORLD_ZONE_IDS.amberwood,
      activeSegment: 4,
      activeEncounter: 3,
      farmMode: true,
      zoneMemories: [
        {
          zoneDefId: WORLD_ZONE_IDS.amberwood,
          currentSegment: 4,
          currentEncounter: 3,
          highestUnlockedSegment: 6,
          completedSegments: [0, 1, 2, 3],
        },
      ],
    };

    foundation.worldRuntime.setWorldLocationSaveState(savedLocation);

    expect(foundation.worldRuntime.currentZoneIndex).toBe(5);
    expect(foundation.worldRuntime.getActiveZoneDef().defId).toBe(WORLD_ZONE_IDS.amberwood);
    expect(foundation.worldRuntime.currentSegment).toBe(4);
    expect(foundation.worldRuntime.currentEncounter).toBe(3);
    expect(foundation.worldRuntime.highestUnlockedSegment).toBe(6);
    expect(foundation.worldRuntime.farmMode).toBe(true);

    const roundTrip = foundation.worldRuntime.getWorldLocationSaveState();
    const yellowMemory = roundTrip.zoneMemories.find(
      (memory) => memory.zoneDefId === WORLD_ZONE_IDS.amberwood,
    );

    expect(roundTrip.activeZoneDefId).toBe(WORLD_ZONE_IDS.amberwood);
    expect(roundTrip.activeSegment).toBe(4);
    expect(roundTrip.activeEncounter).toBe(3);
    expect(roundTrip.farmMode).toBe(true);
    expect(yellowMemory).toMatchObject({
      currentSegment: 4,
      currentEncounter: 3,
      highestUnlockedSegment: 6,
      completedSegments: [0, 1, 2, 3],
    });
  });
});
