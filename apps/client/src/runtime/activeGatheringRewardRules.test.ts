import { describe, expect, it } from "vitest";
import {
  ACTIVE_GATHERING_RULES,
  applyActiveGatheringStrike,
  decayActiveGatheringActivity,
  getActiveGatheringBonuses,
  getActiveGatheringMarkerSpeed,
  getActiveGatheringRewardedQuantity,
} from "./activeGatheringRewardRules";

describe("active gathering activity rules", () => {
  it("uses the validated activity gains and penalties", () => {
    expect(ACTIVE_GATHERING_RULES.activityPerStrike).toEqual({
      miss: -35,
      correct: 15,
      perfect: 30,
    });
    expect(applyActiveGatheringStrike(0, "perfect")).toBe(30);
    expect(applyActiveGatheringStrike(50, "correct")).toBe(65);
    expect(applyActiveGatheringStrike(75, "miss")).toBe(40);
    expect(applyActiveGatheringStrike(90, "perfect")).toBe(100);
  });

  it("maps one activity gauge to both yield and gathering speed", () => {
    expect(getActiveGatheringBonuses(24)).toMatchObject({
      yieldMultiplier: 1,
      speedBonusRatio: 0,
    });
    expect(getActiveGatheringBonuses(25)).toMatchObject({
      yieldMultiplier: 1.5,
      speedBonusRatio: 0.1,
    });
    expect(getActiveGatheringBonuses(50)).toMatchObject({
      yieldMultiplier: 2,
      speedBonusRatio: 0.2,
    });
    expect(getActiveGatheringBonuses(75)).toMatchObject({
      yieldMultiplier: 3,
      speedBonusRatio: 0.3,
    });
  });

  it("normalizes activity decay against the authored cycle duration", () => {
    const shortAfterQuarterCycle = decayActiveGatheringActivity(100, 24, 6);
    const longAfterQuarterCycle = decayActiveGatheringActivity(100, 100, 25);
    expect(shortAfterQuarterCycle).toBeCloseTo(longAfterQuarterCycle, 8);
    expect(shortAfterQuarterCycle).toBeCloseTo(68.75, 8);
  });

  it("uses live activity at cycle completion for the final reward", () => {
    expect(getActiveGatheringRewardedQuantity(1, 24)).toMatchObject({
      quantity: 1,
      multiplier: 1,
    });
    expect(getActiveGatheringRewardedQuantity(1, 50)).toMatchObject({
      quantity: 2,
      multiplier: 2,
    });
    expect(getActiveGatheringRewardedQuantity(1, 75)).toMatchObject({
      quantity: 3,
      multiplier: 3,
    });
  });

  it("preserves fractional x1.5 yield across cycles instead of losing resources", () => {
    const first = getActiveGatheringRewardedQuantity(1, 25, 0);
    expect(first.quantity).toBe(1);
    expect(first.fractionalCarry).toBeCloseTo(0.5, 8);

    const second = getActiveGatheringRewardedQuantity(1, 25, first.fractionalCarry);
    expect(second.quantity).toBe(2);
    expect(second.fractionalCarry).toBeCloseTo(0, 8);
  });

  it("increases marker cadence with the live speed bonus while keeping the target opportunity count", () => {
    const baseSpeed = getActiveGatheringMarkerSpeed(50, 0);
    const maxSpeed = getActiveGatheringMarkerSpeed(50, 0.3);
    expect(baseSpeed).toBeCloseTo(10, 8);
    expect(maxSpeed).toBeCloseTo(13, 8);
  });
});
