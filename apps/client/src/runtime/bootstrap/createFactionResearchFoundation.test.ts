import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "../../data/monsterContentCatalog.js";
import { createFactionResearchFoundation } from "./createFactionResearchFoundation.js";

describe("createFactionResearchFoundation", () => {
  it("derives faction knowledge from the existing monster catalog", () => {
    const foundation = createFactionResearchFoundation({
      getCompletedSegmentCount: () => 0,
    });

    foundation.recordMonsterKill(MONSTER_IDS.keeperWarrior);
    foundation.recordMonsterKill(MONSTER_IDS.keeperChampion);

    expect(foundation.factionKnowledgeService.getMonsterKillCount(MONSTER_IDS.keeperWarrior)).toBe(1);
    expect(foundation.factionKnowledgeService.getFactionKillCount("keeper")).toBe(2);
    expect(foundation.factionKnowledgeService.getFactionEliteKillCount("keeper")).toBe(1);
  });

  it("reconstructs the Keeper relic from authored objectives without Keeper runtime branches", () => {
    let completedSegments = 5;
    const foundation = createFactionResearchFoundation({
      getCompletedSegmentCount: () => completedSegments,
    });

    foundation.recordMonsterKill(MONSTER_IDS.keeperWarrior);
    foundation.recordMonsterKill(MONSTER_IDS.keeperShaman);
    for (let index = 0; index < 95; index += 1) {
      foundation.recordMonsterKill(MONSTER_IDS.keeperWarrior);
    }
    for (let index = 0; index < 3; index += 1) {
      foundation.recordMonsterKill(MONSTER_IDS.keeperChampion);
    }

    expect(foundation.factionKnowledgeService.getFactionKillCount("keeper")).toBe(100);
    expect(foundation.relicService.isReconstructed("relic_keeper")).toBe(true);

    completedSegments = 0;
    expect(foundation.relicService.isReconstructed("relic_keeper")).toBe(true);
  });
});
