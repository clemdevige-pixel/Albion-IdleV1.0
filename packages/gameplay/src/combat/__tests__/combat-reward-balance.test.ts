import { describe, expect, it } from "vitest";
import { getEncounterRewards } from "../combat-profile.js";

describe("World combat reward balance", () => {
  it("preserves the validated T4-T6 reward curve", () => {
    expect(getEncounterRewards(0, 0, 0, "blue")).toEqual({ silver: 10, fame: 15 });
    expect(getEncounterRewards(0, 0, 0, "yellow")).toEqual({ silver: 85, fame: 115 });
    expect(getEncounterRewards(0, 0, 0, "orange")).toEqual({ silver: 160, fame: 215 });
  });

  it("uses the authored T7 reward curve directly", () => {
    expect(getEncounterRewards(0, 0, 0, "red")).toEqual({ silver: 282, fame: 378 });
  });

  it("uses the authored T8 reward curve directly", () => {
    expect(getEncounterRewards(0, 0, 0, "black")).toEqual({ silver: 459, fame: 614 });
  });

  it("keeps late-tier rewards strictly above the preceding band edge", () => {
    const orangeEnd = getEncounterRewards(4, 9, 0, "orange");
    const redStart = getEncounterRewards(0, 0, 0, "red");
    const redEnd = getEncounterRewards(4, 9, 0, "red");
    const blackStart = getEncounterRewards(0, 0, 0, "black");

    expect(redStart.silver).toBeGreaterThan(orangeEnd.silver);
    expect(redStart.fame).toBeGreaterThan(orangeEnd.fame);
    expect(blackStart.silver).toBeGreaterThan(redEnd.silver);
    expect(blackStart.fame).toBeGreaterThan(redEnd.fame);
  });
});
