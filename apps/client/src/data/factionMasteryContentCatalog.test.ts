import { describe, expect, it } from "vitest";
import {
  FACTION_MASTERY_DEFINITIONS,
  FACTION_MASTERY_MAX_LEVEL,
  FACTION_MASTERY_XP_PER_LEVEL,
  getFactionMasteryYieldBonusPercent,
  normalizeFactionId,
  resolveFactionMasteryId,
} from "./factionMasteryContentCatalog.js";

describe("factionMasteryContentCatalog", () => {
  it("authors one generic mastery definition for each validated faction", () => {
    expect(FACTION_MASTERY_DEFINITIONS.map(({ id }) => id)).toEqual([
      "mastery_faction_keeper",
      "mastery_faction_heretic",
      "mastery_faction_undead",
      "mastery_faction_morgana",
    ]);
    expect(FACTION_MASTERY_DEFINITIONS.every(({ category }) => category === "faction")).toBe(true);
    expect(FACTION_MASTERY_DEFINITIONS.every(({ maxLevel }) => maxLevel === 100)).toBe(true);
  });

  it("matches the validated cumulative curve 1500 * L²", () => {
    expect(FACTION_MASTERY_XP_PER_LEVEL).toHaveLength(FACTION_MASTERY_MAX_LEVEL);
    const cumulative = (level: number) => FACTION_MASTERY_XP_PER_LEVEL
      .slice(0, level)
      .reduce((sum, value) => sum + value, 0);

    expect(cumulative(10)).toBe(150_000);
    expect(cumulative(25)).toBe(937_500);
    expect(cumulative(50)).toBe(3_750_000);
    expect(cumulative(75)).toBe(8_437_500);
    expect(cumulative(100)).toBe(15_000_000);
  });

  it("applies the validated +0.5% faction yield per level with a +50% cap", () => {
    expect(getFactionMasteryYieldBonusPercent(0)).toBe(0);
    expect(getFactionMasteryYieldBonusPercent(1)).toBe(0.5);
    expect(getFactionMasteryYieldBonusPercent(50)).toBe(25);
    expect(getFactionMasteryYieldBonusPercent(100)).toBe(50);
    expect(getFactionMasteryYieldBonusPercent(999)).toBe(50);
  });

  it("normalizes authored faction labels to canonical ids", () => {
    expect(normalizeFactionId("Keeper")).toBe("keeper");
    expect(normalizeFactionId(" HERETIC ")).toBe("heretic");
    expect(normalizeFactionId("Undead")).toBe("undead");
    expect(normalizeFactionId("Morgana")).toBe("morgana");
    expect(normalizeFactionId("animal")).toBeUndefined();
  });

  it("resolves supported faction mastery ids from canonical ids or authored labels", () => {
    expect(resolveFactionMasteryId("keeper")).toBe("mastery_faction_keeper");
    expect(resolveFactionMasteryId("Keeper")).toBe("mastery_faction_keeper");
    expect(resolveFactionMasteryId("HERETIC")).toBe("mastery_faction_heretic");
    expect(resolveFactionMasteryId("animal")).toBeUndefined();
  });
});
