import { describe, expect, it } from "vitest";
import {
  FACTION_ACHIEVEMENT_DEFINITIONS,
  FACTION_ACHIEVEMENT_FACTIONS,
} from "./factionAchievementContentCatalog.js";

describe("factionAchievementContentCatalog", () => {
  it("authors exactly 14 milestones per faction plus 5 global Expedition milestones", () => {
    expect(FACTION_ACHIEVEMENT_FACTIONS.map((entry) => entry.id)).toEqual([
      "keeper",
      "heretic",
      "undead",
      "morgana",
    ]);
    for (const faction of FACTION_ACHIEVEMENT_FACTIONS) {
      expect(FACTION_ACHIEVEMENT_DEFINITIONS.filter(
        (definition) => definition.factionId === faction.id,
      )).toHaveLength(14);
    }
    expect(FACTION_ACHIEVEMENT_DEFINITIONS.filter(
      (definition) => definition.group === "expedition",
    )).toHaveLength(5);
    expect(FACTION_ACHIEVEMENT_DEFINITIONS).toHaveLength(61);
  });

  it("locks the validated kill, elite, expedition, dungeon and mastery thresholds", () => {
    const keeper = FACTION_ACHIEVEMENT_DEFINITIONS.filter(
      (definition) => definition.factionId === "keeper",
    );
    expect(keeper.filter((definition) => definition.condition.type === "faction_kill_count")
      .map((definition) => definition.condition.type === "faction_kill_count"
        ? definition.condition.minimum
        : undefined)).toEqual([25, 100, 500]);
    expect(keeper.filter((definition) => definition.condition.type === "faction_elite_kill_count")
      .map((definition) => definition.condition.type === "faction_elite_kill_count"
        ? definition.condition.minimum
        : undefined)).toEqual([3, 25]);
    expect(keeper.filter((definition) => definition.condition.type === "faction_expedition_completed_count")
      .map((definition) => definition.condition.type === "faction_expedition_completed_count"
        ? definition.condition.minimum
        : undefined)).toEqual([1, 10]);
    expect(keeper.filter((definition) => definition.condition.type === "faction_dungeon_completed_count")
      .map((definition) => definition.condition.type === "faction_dungeon_completed_count"
        ? definition.condition.minimum
        : undefined)).toEqual([1, 10]);
    expect(keeper.filter((definition) => definition.condition.type === "faction_mastery_level")
      .map((definition) => definition.condition.type === "faction_mastery_level"
        ? definition.condition.minimum
        : undefined)).toEqual([25, 50, 75, 100]);
  });

  it("locks the 5 validated global Expedition conditions", () => {
    const globals = FACTION_ACHIEVEMENT_DEFINITIONS.filter(
      (definition) => definition.group === "expedition",
    );
    expect(globals.map((definition) => definition.condition)).toEqual([
      { type: "expedition_completed_count", minimum: 1 },
      { type: "expedition_completed_count", minimum: 10 },
      { type: "expedition_completed_count", minimum: 50 },
      { type: "silver_expedition_completed_count", minimum: 1 },
      { type: "silver_expedition_lifetime_silver", minimum: 1_000_000 },
    ]);
  });
});
