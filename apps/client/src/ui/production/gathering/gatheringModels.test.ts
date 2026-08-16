import { describe, expect, it } from "vitest";
import { createInitialGameBridgeState } from "../../../game/GameBridge";
import { buildGatheringModel, selectGatheringSource } from "./gatheringModels";

describe("gathering queued transition model", () => {
  it("exposes the queued gathering message with current encounter progress", () => {
    const initial = createInitialGameBridgeState();
    const state = {
      ...initial,
      queuedGatheringFamily: "Wood",
      world: {
        ...initial.world,
        encounterIndex: 3,
        encounterCount: 5,
      },
    };

    const model = buildGatheringModel(selectGatheringSource(state));

    expect(model.queued).toEqual({
      family: "Wood",
      encounterIndex: 3,
      encounterCount: 5,
    });
  });

  it("hides the transition status when no gathering is queued", () => {
    const initial = createInitialGameBridgeState();
    const model = buildGatheringModel(selectGatheringSource(initial));

    expect(model.queued).toBeNull();
  });
});
