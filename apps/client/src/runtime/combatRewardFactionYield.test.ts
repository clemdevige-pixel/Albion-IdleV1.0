import { describe, expect, it } from "vitest";
import { applyPercentBonusRounded } from "./CombatRewardRuntime.js";

describe("faction combat yield rounding", () => {
  it("rounds Silver and Fame yield to the nearest whole value like faction Runes", () => {
    expect(applyPercentBonusRounded(100, 0.5)).toBe(101);
    expect(applyPercentBonusRounded(150, 0.5)).toBe(151);
    expect(applyPercentBonusRounded(200, 0.5)).toBe(201);
    expect(applyPercentBonusRounded(100, 25)).toBe(125);
  });
});
