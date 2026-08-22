import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "../../data/monsterContentCatalog.js";
import { createFactionBestiaryFoundation } from "./createFactionBestiaryFoundation.js";

describe("createFactionBestiaryFoundation", () => {
  it("derives monster, faction and relic knowledge without duplicating state", () => {
    const foundation = createFactionBestiaryFoundation({
      factionKnowledgeService: {
        isMonsterDiscovered: (monsterId) => monsterId === MONSTER_IDS.keeperWarrior,
        getMonsterKillCount: (monsterId) => monsterId === MONSTER_IDS.keeperWarrior ? 7 : 0,
        getFactionKillCount: (factionId) => factionId === "keeper" ? 42 : 0,
        getFactionEliteKillCount: (factionId) => factionId === "keeper" ? 3 : 0,
      },
      relicService: {
        getProgress: (relicId) => relicId === "relic_keeper"
          ? {
            relicId,
            state: "broken" as const,
            chargeKills: 17,
            requiredChargeKills: 50,
            reconstructed: false,
          }
          : undefined,
      },
    });

    expect(foundation.getKnowledge(MONSTER_IDS.keeperWarrior)).toEqual({
      monsterId: MONSTER_IDS.keeperWarrior,
      factionId: "keeper",
      discovered: true,
      killCount: 7,
      factionKillCount: 42,
      factionEliteKillCount: 3,
      relic: {
        relicId: "relic_keeper",
        state: "broken",
        chargeKills: 17,
        requiredChargeKills: 50,
        reconstructed: false,
      },
    });
  });
});
