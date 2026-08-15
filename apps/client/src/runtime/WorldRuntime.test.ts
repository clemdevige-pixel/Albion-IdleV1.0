import { describe, expect, it } from "vitest";
import type { WorldLocationSaveState } from "@game/gameplay";
import { createWorldFoundation } from "./bootstrap/createWorldFoundation";

function createLoadedWorld(activeEncounter: number) {
  const foundation = createWorldFoundation();
  const savedLocation = {
    activeZoneDefId: "zone_forest",
    activeSegment: 2,
    activeEncounter,
    farmMode: false,
    zoneMemories: [
      {
        zoneDefId: "zone_forest",
        currentSegment: 2,
        currentEncounter: activeEncounter,
        highestUnlockedSegment: 5,
        completedSegments: [0, 1],
      },
    ],
  } as unknown as WorldLocationSaveState;

  foundation.worldRuntime.setWorldLocationSaveState(savedLocation);
  return foundation;
}

describe("WorldRuntime combat navigation rules", () => {
  it("applies a queued manual segment change only after the current segment completes", () => {
    const { worldRuntime } = createLoadedWorld(0);

    worldRuntime.advanceVictory();
    worldRuntime.advanceVictory();
    worldRuntime.advanceVictory();
    expect(worldRuntime.currentSegment).toBe(2);
    expect(worldRuntime.currentEncounter).toBe(3);

    expect(worldRuntime.queueSegmentChange(1)).toBe(true);
    expect(worldRuntime.pendingSegment).toBe(0);

    worldRuntime.advanceVictory();
    expect(worldRuntime.currentSegment).toBe(2);
    expect(worldRuntime.currentEncounter).toBe(4);
    expect(worldRuntime.pendingSegment).toBe(0);

    worldRuntime.advanceVictory();
    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingSegment).toBeNull();
  });

  it("applies queued cross-zone travel only after the current segment completes", () => {
    const { worldRuntime, progressionManager, forestZoneDefId } = createLoadedWorld(0);
    progressionManager.markCompleted(forestZoneDefId);

    expect(worldRuntime.selectZone(2, 1)).toBe(true);
    expect(worldRuntime.currentZoneIndex).toBe(0);
    expect(worldRuntime.pendingZone).toBe(1);
    expect(worldRuntime.pendingZoneSegment).toBe(0);

    for (let encounter = 0; encounter < 4; encounter += 1) {
      worldRuntime.advanceVictory();
    }
    expect(worldRuntime.currentZoneIndex).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(4);
    expect(worldRuntime.pendingZone).toBe(1);

    worldRuntime.advanceVictory();
    expect(worldRuntime.currentZoneIndex).toBe(1);
    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingZone).toBeNull();
  });

  it("applies a queued segment destination when defeat ends the current attempt", () => {
    const { worldRuntime } = createLoadedWorld(0);

    expect(worldRuntime.queueSegmentChange(1)).toBe(true);
    worldRuntime.advanceVictory();
    worldRuntime.advanceDefeat();

    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingSegment).toBeNull();
  });

  it("applies queued cross-zone travel when defeat ends the current attempt", () => {
    const { worldRuntime, progressionManager, forestZoneDefId } = createLoadedWorld(0);
    progressionManager.markCompleted(forestZoneDefId);

    expect(worldRuntime.selectZone(2, 1)).toBe(true);
    worldRuntime.advanceVictory();
    worldRuntime.advanceDefeat();

    expect(worldRuntime.currentZoneIndex).toBe(1);
    expect(worldRuntime.currentSegment).toBe(0);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.pendingZone).toBeNull();
  });

  it("restarts the saved active segment from encounter zero on load", () => {
    const { worldRuntime } = createLoadedWorld(3);

    expect(worldRuntime.currentSegment).toBe(2);
    expect(worldRuntime.currentEncounter).toBe(0);
    expect(worldRuntime.getWorldLocationSaveState().activeEncounter).toBe(0);
  });
});
