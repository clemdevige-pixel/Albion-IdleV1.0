import { describe, it, expect } from "vitest";
import {
  WEAPON_MASTERY_BASE_XP,
  GATHERING_MASTERY_BASE_XP,
  WEAPON_MASTERY_XP,
  GATHERING_MASTERY_XP,
  ExperienceTable,
} from "../index.js";

describe("Mastery Experience Curve (Variant B)", () => {
  it("preserves early game levels 1..10 exactly for weapon mastery", () => {
    expect(WEAPON_MASTERY_XP.slice(0, 10)).toEqual(Array.from(WEAPON_MASTERY_BASE_XP));
    expect(WEAPON_MASTERY_XP[0]).toBe(100);
    expect(WEAPON_MASTERY_XP[4]).toBe(650);
    expect(WEAPON_MASTERY_XP[9]).toBe(2700);
  });

  it("preserves early game levels 1..10 exactly for gathering mastery", () => {
    expect(GATHERING_MASTERY_XP.slice(0, 10)).toEqual(Array.from(GATHERING_MASTERY_BASE_XP));
    expect(GATHERING_MASTERY_XP[0]).toBe(50);
    expect(GATHERING_MASTERY_XP[4]).toBe(400);
    expect(GATHERING_MASTERY_XP[9]).toBe(1700);
  });

  it("generates exact player-friendly rounded values for post-10 weapon curve", () => {
    expect(WEAPON_MASTERY_XP[10]).toBe(2740);   // Level 11 -> 12
    expect(WEAPON_MASTERY_XP[19]).toBe(5880);   // Level 20 -> 21
    expect(WEAPON_MASTERY_XP[29]).toBe(14600);  // Level 30 -> 31
    expect(WEAPON_MASTERY_XP[49]).toBe(47000);  // Level 50 -> 51
    expect(WEAPON_MASTERY_XP[69]).toBe(98300);  // Level 70 -> 71
    expect(WEAPON_MASTERY_XP[89]).toBe(168000); // Level 90 -> 91
    expect(WEAPON_MASTERY_XP[98]).toBe(205000); // Level 99 -> 100
  });

  it("generates exact player-friendly rounded values for post-10 gathering curve", () => {
    expect(GATHERING_MASTERY_XP[10]).toBe(1730);   // Level 11 -> 12
    expect(GATHERING_MASTERY_XP[19]).toBe(3470);   // Level 20 -> 21
    expect(GATHERING_MASTERY_XP[29]).toBe(8080);   // Level 30 -> 31
    expect(GATHERING_MASTERY_XP[49]).toBe(24700);  // Level 50 -> 51
    expect(GATHERING_MASTERY_XP[69]).toBe(50400);  // Level 70 -> 71
    expect(GATHERING_MASTERY_XP[89]).toBe(84600);  // Level 90 -> 91
    expect(GATHERING_MASTERY_XP[98]).toBe(103000); // Level 99 -> 100
  });

  it("enforces strict monotonic growth (XP(L+1) > XP(L)) from level 1 to 100 with zero plateaus", () => {
    for (let i = 1; i < WEAPON_MASTERY_XP.length; i++) {
      expect(WEAPON_MASTERY_XP[i]).toBeGreaterThan(WEAPON_MASTERY_XP[i - 1]!);
    }
    for (let i = 1; i < GATHERING_MASTERY_XP.length; i++) {
      expect(GATHERING_MASTERY_XP[i]).toBeGreaterThan(GATHERING_MASTERY_XP[i - 1]!);
    }
  });

  it("enforces correct readability rounding increments across all levels", () => {
    WEAPON_MASTERY_XP.slice(10).forEach((xp) => {
      if (xp < 10000) {
        expect(xp % 10).toBe(0);
      } else if (xp < 100000) {
        expect(xp % 100).toBe(0);
      } else {
        expect(xp % 1000).toBe(0);
      }
    });

    GATHERING_MASTERY_XP.slice(10).forEach((xp) => {
      if (xp < 10000) {
        expect(xp % 10).toBe(0);
      } else if (xp < 100000) {
        expect(xp % 100).toBe(0);
      } else {
        expect(xp % 1000).toBe(0);
      }
    });
  });

  it("ExperienceTable correctly integrates the 100-level curve for leveling and overflow", () => {
    const table = new ExperienceTable(WEAPON_MASTERY_XP);
    expect(table.getMaxLevel()).toBe(100);

    // Index zero is the level 0 -> 1 requirement. The first nine levels cost 7,500 XP.
    expect(table.getLevel(7499, 100)).toEqual({ level: 8, remainingXp: 2099 });
    expect(table.getLevel(7500, 100)).toEqual({ level: 9, remainingXp: 0 });

    // Reaching level 10 additionally consumes the index-nine requirement (2,700 XP).
    expect(table.getLevel(10200, 100)).toEqual({ level: 10, remainingXp: 0 });
    expect(table.getLevel(12940, 100)).toEqual({ level: 11, remainingXp: 0 });

    // Level 100 max level capping & overflow
    const totalTo100 = WEAPON_MASTERY_XP.reduce((total, requirement) => total + requirement, 0);
    expect(table.getLevel(totalTo100, 100)).toEqual({ level: 100, remainingXp: 0 });
    expect(table.getLevel(totalTo100 + 500, 100)).toEqual({ level: 100, remainingXp: 500 });
  });
});
