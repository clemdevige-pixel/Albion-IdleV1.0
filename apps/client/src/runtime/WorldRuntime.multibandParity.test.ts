import { describe, expect, it } from "vitest";
import type { WorldLocationSaveState, ZoneDefinitionId } from "@game/gameplay";
import { WORLD_ZONE_IDS, WORLD_ZONE_ORDER } from "../data/worldContentCatalog";
import { createWorldFoundation } from "./bootstrap/createWorldFoundation";

function unlockThrough(
  progressionManager: ReturnType<typeof createWorldFoundation>["progressionManager"],
  targetZoneDefId: ZoneDefinitionId,
): void {
  const targetIndex = WORLD_ZONE_ORDER.indexOf(targetZoneDefId);
  if (targetIndex < 0) throw new Error(`Unknown zone ${String(targetZoneDefId)}`);
  for (let index = 0; index < targetIndex; index += 1) {
    progressionManager.markCompleted(WORLD_ZONE_ORDER[index]!);
  }
}

function loadLocation(
  zoneDefId: ZoneDefinitionId,
  segment: number,
  encounter: number,
  highestUnlockedSegment: number,
) {
  const foundation = createWorldFoundation();
  unlockThrough(foundation.progressionManager, zoneDefId);
  const location = {
    activeZoneDefId: zoneDefId,
    activeSegment: segment,
    activeEncounter: encounter,
    farmMode: false,
    zoneMemories: [
      {
        zoneDefId,
        currentSegment: segment,
        currentEncounter: encounter,
        highestUnlockedSegment,
        completedSegments: Array.from({ length: segment }, (_, index) => index),
      },
    ],
  } satisfies WorldLocationSaveState;
  foundation.worldRuntime.setWorldLocationSaveState(location);
  return foundation;
}

describe.each([
  ["Blue", WORLD_ZONE_IDS.forest],
  ["Yellow", WORLD_ZONE_IDS.amberwood],
] as const)("WorldRuntime %s encounter parity", (_band, zoneDefId) => {
  it("advances encounters 1 through 5 and only enters the next segment after encounter 5", () => {
    const { worldRuntime } = loadLocation(zoneDefId, 2, 0, 2);

    for (let victory = 1; victory <= 4; victory += 1) {
      worldRuntime.advanceVictory();
      expect(worldRuntime.currentSegment).toBe(2);
      expect(worldRuntime.currentEncounter).toBe(victory);
      expect(worldRuntime.highestUnlockedSegment).toBe(2);
    }

    worldRuntime.advanceVictory();

    expect(worldRuntime.currentSegment).toBe(3);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.highestUnlockedSegment).toBe(3);
  });
});

describe("WorldRuntime cross-band frontier", () => {
  it("enters Amberwood S1 even when a stale save remembers Amberwood S2", () => {
    const foundation = createWorldFoundation();
    unlockThrough(foundation.progressionManager, WORLD_ZONE_IDS.mountain);
    foundation.worldRuntime.setWorldLocationSaveState({
      activeZoneDefId: WORLD_ZONE_IDS.mountain,
      activeSegment: 9,
      activeEncounter: 4,
      farmMode: false,
      zoneMemories: [
        {
          zoneDefId: WORLD_ZONE_IDS.mountain,
          currentSegment: 9,
          currentEncounter: 4,
          highestUnlockedSegment: 9,
          completedSegments: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        },
        {
          zoneDefId: WORLD_ZONE_IDS.amberwood,
          currentSegment: 1,
          currentEncounter: 0,
          highestUnlockedSegment: 1,
          completedSegments: [0],
        },
      ],
    });

    foundation.worldRuntime.advanceVictory();

    expect(foundation.worldRuntime.getActiveZoneDef().defId).toBe(WORLD_ZONE_IDS.amberwood);
    expect(foundation.worldRuntime.currentSegment).toBe(0);
    expect(foundation.worldRuntime.currentEncounter).toBe(0);
  });
});

describe.each([
  ["Blue -> Yellow", WORLD_ZONE_IDS.mountain, WORLD_ZONE_IDS.amberwood],
  ["Yellow -> Yellow", WORLD_ZONE_IDS.amberwood, WORLD_ZONE_IDS.gloamfen],
] as const)("WorldRuntime boss transition parity: %s", (_label, fromZoneDefId, toZoneDefId) => {
  it("unlocks and enters the next zone after the final boss", () => {
    const foundation = loadLocation(fromZoneDefId, 9, 4, 9);

    expect(foundation.progressionManager.isUnlocked(toZoneDefId)).toBe(false);

    foundation.worldRuntime.advanceVictory();

    expect(foundation.progressionManager.isUnlocked(toZoneDefId)).toBe(true);
    expect(foundation.worldRuntime.getActiveZoneDef().defId).toBe(toZoneDefId);
    expect(foundation.worldRuntime.currentSegment).toBe(0);
    expect(foundation.worldRuntime.currentEncounter).toBe(0);
  });
});
