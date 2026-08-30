import { describe, expect, it } from "vitest";
import { resolveTowerRewardBreakdown } from "./TowerRewardRuntime.js";

describe("TowerRewardRuntime", () => {
  it("uses 60 percent of end-tier World rewards on ordinary floors", () => {
    expect(resolveTowerRewardBreakdown({
      seed: "tower-reward-seed",
      currentFloor: 1,
      highestClearedFloor: 0,
      checkpointFloor: 1,
      endlessUnlocked: false,
    })).toMatchObject({
      floor: 1,
      tier: 8,
      factionId: "keeper",
      baseSilver: 339,
      baseFame: 454,
      repeatableBlockChestSilver: 0,
      firstClearBlockBonusSilver: 0,
      majorBossFirstClearBonusSilver: 0,
      firstClear: true,
    });
  });

  it("adds a conservative repeatable block chest and a first-clear bonus on floor 5", () => {
    expect(resolveTowerRewardBreakdown({
      seed: "tower-reward-seed",
      currentFloor: 5,
      highestClearedFloor: 4,
      checkpointFloor: 1,
      endlessUnlocked: false,
    })).toMatchObject({
      tier: 8,
      baseSilver: 339,
      baseFame: 454,
      repeatableBlockChestSilver: 800,
      firstClearBlockBonusSilver: 8_000,
      majorBossFirstClearBonusSilver: 0,
      firstClear: true,
    });
  });

  it("does not repeat the first-clear block bonus when farming an old checkpoint", () => {
    expect(resolveTowerRewardBreakdown({
      seed: "tower-reward-seed",
      currentFloor: 5,
      highestClearedFloor: 5,
      checkpointFloor: 1,
      endlessUnlocked: false,
    })).toMatchObject({
      repeatableBlockChestSilver: 800,
      firstClearBlockBonusSilver: 0,
      majorBossFirstClearBonusSilver: 0,
      firstClear: false,
    });
  });

  it("adds the major first-clear milestone reward at floor 25", () => {
    expect(resolveTowerRewardBreakdown({
      seed: "tower-reward-seed",
      currentFloor: 25,
      highestClearedFloor: 24,
      checkpointFloor: 21,
      endlessUnlocked: false,
    })).toMatchObject({
      floor: 25,
      tier: 5,
      factionId: "morgana",
      baseSilver: 94,
      baseFame: 127,
      repeatableBlockChestSilver: 200,
      firstClearBlockBonusSilver: 2_000,
      majorBossFirstClearBonusSilver: 4_000,
      firstClear: true,
    });
  });
});
