import { describe, expect, it } from "vitest";
import { asMasteryId } from "@game/gameplay";
import { DUNGEON_DEFINITIONS } from "../../data/dungeonContentCatalog.js";
import { FACTION_ACHIEVEMENT_DEFINITIONS } from "../../data/factionAchievementContentCatalog.js";
import { createFactionAchievementFoundation } from "./createFactionAchievementFoundation.js";

function definition(id: string) {
  const result = FACTION_ACHIEVEMENT_DEFINITIONS.find((entry) => entry.id === id);
  if (result === undefined) throw new Error(`Missing test achievement: ${id}`);
  return result;
}

describe("createFactionAchievementFoundation", () => {
  it("derives all validated progress types from their authoritative owners", () => {
    const knownMonsters = new Set<string>();
    const keeperDungeonIds = new Set(
      DUNGEON_DEFINITIONS
        .filter((entry) => entry.faction.toLowerCase() === "keeper")
        .map((entry) => entry.id),
    );
    const foundation = createFactionAchievementFoundation({
      factionKnowledgeService: {
        isMonsterDiscovered: (monsterId) => knownMonsters.has(monsterId),
        getFactionKillCount: (factionId) => factionId === "keeper" ? 100 : 0,
        getFactionEliteKillCount: (factionId) => factionId === "keeper" ? 3 : 0,
      },
      relicService: {
        isReconstructed: (relicId) => relicId === "relic_keeper",
      },
      expeditionService: {
        getCompletedCount: (typeId) => typeId === "keeper" ? 10 : typeId === "silver" ? 1 : 0,
        getTotalCompletedCount: () => 10,
      },
      expeditionRewardLedger: {
        getLifetimeSilverCredited: () => 1_000_000,
      },
      dungeonRuntime: {
        getCompletedDefinitionCount: (definitionId) => keeperDungeonIds.has(definitionId) ? 2 : 0,
      },
      masteryService: {
        getMasteryState: (masteryId) => masteryId === asMasteryId("mastery_faction_keeper")
          ? { level: 50 }
          : undefined,
      },
    });

    const discovery = definition("keeper_discovery");
    if (discovery.condition.type !== "faction_unit_discovery") throw new Error("invalid fixture");
    knownMonsters.add(discovery.condition.monsterIds[0] ?? "");
    expect(foundation.getProgress(discovery)).toMatchObject({ current: 1, target: 2, completed: false });
    knownMonsters.add(discovery.condition.monsterIds[1] ?? "");
    expect(foundation.getProgress(discovery).completed).toBe(true);

    expect(foundation.getProgress(definition("keeper_hunter_2")).completed).toBe(true);
    expect(foundation.getProgress(definition("keeper_elite_hunter")).completed).toBe(true);
    expect(foundation.getProgress(definition("keeper_relic_reconstructed")).completed).toBe(true);
    expect(foundation.getProgress(definition("keeper_expeditionary")).completed).toBe(true);
    expect(foundation.getProgress(definition("keeper_conqueror")).completed).toBe(true);
    expect(foundation.getProgress(definition("keeper_mastery_2")).completed).toBe(true);
    expect(foundation.getProgress(definition("expedition_regular")).completed).toBe(true);
    expect(foundation.getProgress(definition("expedition_first_silver")).completed).toBe(true);
    expect(foundation.getProgress(definition("expedition_fortune")).completed).toBe(true);
  });

  it("keeps unauthored faction Expedition content at zero without special-case branches", () => {
    const foundation = createFactionAchievementFoundation({
      factionKnowledgeService: {
        isMonsterDiscovered: () => false,
        getFactionKillCount: () => 0,
        getFactionEliteKillCount: () => 0,
      },
      relicService: { isReconstructed: () => false },
      expeditionService: {
        getCompletedCount: () => 99,
        getTotalCompletedCount: () => 99,
      },
      expeditionRewardLedger: { getLifetimeSilverCredited: () => 0 },
      dungeonRuntime: { getCompletedDefinitionCount: () => 0 },
      masteryService: { getMasteryState: () => undefined },
    });

    expect(foundation.getProgress(definition("heretic_explorer"))).toMatchObject({
      current: 0,
      target: 1,
      completed: false,
    });
  });
});
