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

  it("extends an existing Blue-only location save with default Yellow memories", () => {
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
    expect(restored.zoneMemories).toHaveLength(10);
    expect(restored.zoneMemories.slice(0, blueMemories.length)).toEqual(blueMemories);
    expect(restored.zoneMemories.slice(blueMemories.length).map(({ zoneDefId }) => zoneDefId))
      .toEqual(WORLD_ZONE_IDS_BY_BAND.yellow);
  });
});
