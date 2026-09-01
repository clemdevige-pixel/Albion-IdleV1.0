import { describe, expect, it } from "vitest";
import type { DungeonDefinition, DungeonRunState, TowerProgressionSnapshot } from "@game/gameplay";
import { buildDungeonCombatTimeline, buildTowerCombatTimeline } from "./combatTimelineModel.js";

const dungeonDefinition: DungeonDefinition = {
  id: "test_dungeon",
  tier: 4,
  faction: "Keeper",
  keyItemId: "test_key",
  combatProfileId: "test_profile",
  lootTableId: "test_loot",
  encounters: [
    { id: "normal_1", kind: "normal", monsterDefinitionId: "monster_normal" },
    { id: "elite_1", kind: "elite", monsterDefinitionId: "monster_elite" },
    { id: "boss_1", kind: "boss", monsterDefinitionId: "monster_boss" },
  ],
};

describe("combatTimelineModel", () => {
  it("projects an active dungeon run into encounter nodes", () => {
    const run: DungeonRunState = {
      definitionId: dungeonDefinition.id,
      status: "active",
      encounterIndex: 1,
      completedEncounterIds: ["normal_1"],
    };

    const model = buildDungeonCombatTimeline(run, dungeonDefinition);

    expect(model.mode).toBe("dungeon");
    expect(model.title).toBe("Donjon T4 — Keeper");
    expect(model.subtitle).toBe("RENCONTRE 2 / 3");
    expect(model.railProgress).toBe(50);
    expect(model.nodes.map(({ kind, state }) => ({ kind, state }))).toEqual([
      { kind: "normal", state: "complete" },
      { kind: "elite", state: "current" },
      { kind: "boss", state: "upcoming" },
    ]);
  });

  it("projects the current five-floor Tower block and major boss", () => {
    const progression: TowerProgressionSnapshot = {
      seed: "timeline-test",
      currentFloor: 23,
      highestClearedFloor: 22,
      checkpointFloor: 21,
      endlessUnlocked: false,
    };

    const model = buildTowerCombatTimeline(progression);

    expect(model.mode).toBe("tower");
    expect(model.title).toBe("Tour sans fin — Bloc 5");
    expect(model.subtitle).toContain("ÉTAGES 21–25");
    expect(model.railProgress).toBe(50);
    expect(model.nodes.map((node) => node.label)).toEqual(["21", "22", "23", "24", "25"]);
    expect(model.nodes[2]).toMatchObject({ kind: "reinforced", state: "current" });
    expect(model.nodes[4]).toMatchObject({ kind: "major-boss", state: "upcoming" });
  });
});
