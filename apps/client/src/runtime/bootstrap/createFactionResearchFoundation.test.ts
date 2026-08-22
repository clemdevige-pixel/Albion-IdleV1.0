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

  it("drops the Keeper relic on its boss, charges from later Keeper kills and waits for Academy examination authority", () => {
    let canExamine = false;
    const foundation = createFactionResearchFoundation({
      getCompletedSegmentCount: () => 0,
    });
    foundation.bindReconstructionGate(() => canExamine);

    foundation.recordMonsterKill(MONSTER_IDS.keeperAncient);
    expect(foundation.relicService.getProgress("relic_keeper")).toMatchObject({
      state: "broken",
      chargeKills: 0,
    });

    for (let index = 0; index < 50; index += 1) {
      foundation.recordMonsterKill(MONSTER_IDS.keeperWarrior);
    }
    expect(foundation.relicService.getProgress("relic_keeper")?.state).toBe("charged");
    expect(foundation.relicService.isReconstructed("relic_keeper")).toBe(false);

    canExamine = true;
    expect(foundation.resolveWorldProgress()).toEqual(["relic_keeper"]);
    expect(foundation.relicService.getProgress("relic_keeper")?.state).toBe("examined");
    expect(foundation.relicService.isReconstructed("relic_keeper")).toBe(true);
  });
});
