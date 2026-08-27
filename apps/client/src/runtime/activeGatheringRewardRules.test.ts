import { describe, expect, it } from "vitest";
import {
  ACTIVE_GATHERING_REWARD_RULES,
  applyActiveGatheringStrike,
  getActiveGatheringRewardProgress,
  getActiveGatheringRewardedQuantity,
} from "./activeGatheringRewardRules";

describe("active gathering reward rules", () => {
  it("uses the validated score-only active gathering bonuses", () => {
    expect(ACTIVE_GATHERING_REWARD_RULES.scorePerStrike).toEqual({
      miss: 0,
      correct: 8,
      perfect: 20,
    });
  });

  it("unlocks x2 at 60 and x3 at 140", () => {
    expect(getActiveGatheringRewardProgress(59).multiplier).toBe(1);
    expect(getActiveGatheringRewardProgress(60).multiplier).toBe(2);
    expect(getActiveGatheringRewardProgress(139).multiplier).toBe(2);
    expect(getActiveGatheringRewardProgress(140).multiplier).toBe(3);
    expect(getActiveGatheringRewardedQuantity(1, 59)).toBe(1);
    expect(getActiveGatheringRewardedQuantity(1, 60)).toBe(2);
    expect(getActiveGatheringRewardedQuantity(1, 140)).toBe(3);
  });

  it("keeps the streak on correct/perfect and resets it on miss", () => {
    const first = applyActiveGatheringStrike({ streak: 0, score: 0 }, "perfect");
    const second = applyActiveGatheringStrike(first, "correct");
    expect(second).toEqual({ streak: 2, score: 28 });
    expect(applyActiveGatheringStrike(second, "miss")).toEqual({ streak: 0, score: 0 });
  });
});
