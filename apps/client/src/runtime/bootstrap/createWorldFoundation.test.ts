import { describe, expect, it } from "vitest";
import {
  buildWorldViewModel,
  createWorldFoundation,
} from "./createWorldFoundation";
import {
  WORLD_ZONE_IDS,
  WORLD_ZONE_IDS_BY_BAND,
} from "../../data/worldContentCatalog";

describe("createWorldFoundation", () => {
  it("starts in the forest and builds the existing world view model", () => {
    const foundation = createWorldFoundation();
    const viewModel = buildWorldViewModel(foundation);

    expect(viewModel.zoneDefId).toBe(foundation.forestZoneDefId);
    expect(viewModel.zoneIndex).toBe(1);
    expect(viewModel.segmentIndex).toBe(1);
    expect(viewModel.zones).toHaveLength(foundation.zoneOrder.length);
  });

  it("extends an existing Blue-only location save with default Yellow and Orange memories", () => {
    const foundation = createWorldFoundation();
    const blueMemories = WORLD_ZONE_IDS_BY_BAND.blue.map((zoneDefId) => ({
      zoneDefId,
      currentSegment: 0,
      highestUnlockedSegment: 0,
      completedSegments: [],
    }));

    foundation.worldRuntime.setWorldLocationSaveState({
      activeZoneDefId: WORLD_ZONE_IDS.forest,
      activeSegment: 0,
      farmMode: false,
      zoneMemories: blueMemories,
    });

    const restored = foundation.worldRuntime.getWorldLocationSaveState();
    expect(restored.zoneMemories).toHaveLength(15);
    expect(restored.zoneMemories.slice(0, blueMemories.length)).toEqual(
      blueMemories.map((memory) => ({ ...memory, currentEncounter: 0 })),
    );
    expect(restored.zoneMemories.slice(blueMemories.length).map(({ zoneDefId }) => zoneDefId))
      .toEqual([
        ...WORLD_ZONE_IDS_BY_BAND.yellow,
        ...WORLD_ZONE_IDS_BY_BAND.orange,
      ]);
  });

  it("persists the encounter index so reload cannot replay rewarded fights", () => {
    const first = createWorldFoundation();
    first.worldRuntime.advanceVictory();
    first.worldRuntime.advanceVictory();
    first.worldRuntime.advanceVictory();

    expect(first.worldRuntime.currentEncounter).toBe(3);
    const saved = first.worldRuntime.getWorldLocationSaveState();
    expect(saved.activeEncounter).toBe(3);
    expect(saved.zoneMemories[0]?.currentEncounter).toBe(3);

    const restored = createWorldFoundation();
    restored.worldRuntime.setWorldLocationSaveState(saved);

    expect(restored.worldRuntime.currentSegment).toBe(0);
    expect(restored.worldRuntime.currentEncounter).toBe(3);
    expect(restored.worldRuntime.getWorldLocationSaveState().activeEncounter).toBe(3);
  });

  it("keeps legacy saves compatible by defaulting missing encounter progress to zero", () => {
    const foundation = createWorldFoundation();
    foundation.worldRuntime.setWorldLocationSaveState({
      activeZoneDefId: WORLD_ZONE_IDS.forest,
      activeSegment: 0,
      farmMode: false,
      zoneMemories: [{
        zoneDefId: WORLD_ZONE_IDS.forest,
        currentSegment: 0,
        highestUnlockedSegment: 0,
        completedSegments: [],
      }],
    });

    expect(foundation.worldRuntime.currentEncounter).toBe(0);
  });
});
