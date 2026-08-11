import { describe, expect, it } from "vitest";
import type { GatheringVM } from "../../game/GameBridge";
import { selectRunningGathering } from "../../game/bridge/GatheringBridgeSelectors";
import { syncGatheringToBridge } from "./productionSync";

describe("gathering bridge projection", () => {
  it("keeps the browsed tier independent from the running cycle tier", () => {
    let projected: GatheringVM | undefined;

    syncGatheringToBridge(
      (value) => { projected = value; },
      {
        id: "wood-cycle-t3",
        getRequiredTicks: () => 24,
        getElapsedTicks: () => 6,
      },
      100,
      4,
      3,
      36,
      "Bois T4",
      "Wood",
      "resource_wood",
      4,
      12,
      2,
      { resourceName: "Bois T3", resourceTier: 3 },
    );

    expect(projected).toMatchObject({
      status: "idle",
      resourceName: "Bois T4",
      resourceTier: 4,
      progress: 0,
      durationSeconds: 18,
      storedQuantity: 12,
      activeMiniGame: undefined,
      activeCycle: {
        resourceName: "Bois T3",
        resourceTier: 3,
        progress: 25,
        durationSeconds: 12,
        cycleId: "wood-cycle-t3",
        strikesUsed: 2,
      },
    });

    expect(selectRunningGathering([projected!])).toMatchObject({
      status: "gathering",
      resourceName: "Bois T3",
      resourceTier: 3,
      progress: 25,
      durationSeconds: 12,
      activeMiniGame: { cycleId: "wood-cycle-t3", strikesUsed: 2 },
    });
  });

  it("projects progress normally when the browsed tier is the active tier", () => {
    let projected: GatheringVM | undefined;

    syncGatheringToBridge(
      (value) => { projected = value; },
      {
        id: "future-tier-cycle",
        getRequiredTicks: () => 40,
        getElapsedTicks: () => 10,
      },
      100,
      8,
      0,
      40,
      "Ressource future",
      "Wood",
      "resource_wood",
      5,
      7,
      1,
      { resourceName: "Ressource future", resourceTier: 5 },
    );

    expect(projected).toMatchObject({
      status: "gathering",
      resourceTier: 5,
      progress: 25,
      activeMiniGame: { cycleId: "future-tier-cycle", strikesUsed: 1 },
    });
  });
});
