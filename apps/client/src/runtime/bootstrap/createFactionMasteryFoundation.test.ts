import { describe, expect, it } from "vitest";
import { resolveFactionMasteryId } from "../../data/factionMasteryContentCatalog.js";
import { createFactionMasteryFoundation } from "./createFactionMasteryFoundation.js";
import { createProgressionFoundation } from "./createProgressionFoundation.js";

describe("createFactionMasteryFoundation", () => {
  it("converts raw faction Fame to one-to-one Mastery XP", () => {
    const progression = createProgressionFoundation();
    const foundation = createFactionMasteryFoundation(progression);

    foundation.awardRawFactionFame("keeper", 150_000);

    const masteryId = resolveFactionMasteryId("keeper");
    expect(masteryId).toBeDefined();
    expect(progression.masteryService.getMasteryState(masteryId!)?.totalLifetimeXp).toBe(150_000);
    expect(progression.masteryService.getMasteryState(masteryId!)?.level).toBe(10);
    expect(foundation.getYieldBonusPercent("keeper")).toBe(5);
  });

  it("ignores unsupported factions instead of creating ad-hoc masteries", () => {
    const progression = createProgressionFoundation();
    const foundation = createFactionMasteryFoundation(progression);

    foundation.awardRawFactionFame("animal", 10_000);

    expect(foundation.getYieldBonusPercent("animal")).toBe(0);
    expect(progression.masteryService.getUnlockedMasteries()).not.toContain("mastery_faction_animal");
  });
});
