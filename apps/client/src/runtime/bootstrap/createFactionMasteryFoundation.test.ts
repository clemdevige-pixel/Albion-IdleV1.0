import { describe, expect, it } from "vitest";
import { resolveFactionMasteryId } from "../../data/factionMasteryContentCatalog.js";
import { createFactionMasteryFoundation } from "./createFactionMasteryFoundation.js";
import { createProgressionFoundation } from "./createProgressionFoundation.js";

describe("createFactionMasteryFoundation", () => {
  it("converts raw faction Fame from authored display labels to one-to-one Mastery XP", () => {
    const progression = createProgressionFoundation();
    const foundation = createFactionMasteryFoundation(progression);

    foundation.awardRawFactionFame("Keeper", 150_000);

    const masteryId = resolveFactionMasteryId("keeper");
    if (masteryId === undefined) throw new Error("Keeper faction mastery must be authored");
    expect(progression.masteryService.getMasteryState(masteryId)?.totalLifetimeXp).toBe(150_000);
    expect(progression.masteryService.getMasteryState(masteryId)?.level).toBe(10);
    expect(foundation.getYieldBonusPercent("Keeper")).toBe(5);
  });

  it("returns the yield active before a kill awards its raw faction Fame", () => {
    const progression = createProgressionFoundation();
    const foundation = createFactionMasteryFoundation(progression);

    expect(foundation.awardRawFactionFame("Keeper", 1_500)).toBe(0);
    expect(foundation.getYieldBonusPercent("Keeper")).toBe(0.5);

    expect(foundation.awardRawFactionFame("Keeper", 4_500)).toBe(0.5);
    expect(foundation.getYieldBonusPercent("Keeper")).toBe(1);
  });

  it("ignores unsupported factions instead of creating ad-hoc masteries", () => {
    const progression = createProgressionFoundation();
    const foundation = createFactionMasteryFoundation(progression);

    foundation.awardRawFactionFame("animal", 10_000);

    expect(foundation.getYieldBonusPercent("animal")).toBe(0);
    expect(progression.masteryService.getUnlockedMasteries()).not.toContain("mastery_faction_animal");
  });
});
