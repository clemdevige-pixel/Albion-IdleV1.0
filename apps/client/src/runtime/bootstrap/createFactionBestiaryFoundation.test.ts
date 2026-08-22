import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "../../data/monsterContentCatalog.js";
import { createFactionBestiaryFoundation } from "./createFactionBestiaryFoundation.js";

describe("createFactionBestiaryFoundation", () => {
  it("derives monster and faction kill knowledge without Relic state", () => {
    const foundation = createFactionBestiaryFoundation({
      factionKnowledgeService: {
        isMonsterDiscovered: (monsterId) => monsterId === MONSTER_IDS.keeperWarrior,
        getMonsterKillCount: (monsterId) => monsterId === MONSTER_IDS.keeperWarrior ? 7 : 0,
        getFactionKillCount: (factionId) => factionId === "keeper" ? 42 : 0,
        getFactionEliteKillCount: (factionId) => factionId === "keeper" ? 3 : 0,
      },
    });

    expect(foundation.getKnowledge(MONSTER_IDS.keeperWarrior)).toEqual({
      monsterId: MONSTER_IDS.keeperWarrior,
      factionId: "keeper",
      discovered: true,
      killCount: 7,
      factionKillCount: 42,
      factionEliteKillCount: 3,
    });
  });
});
