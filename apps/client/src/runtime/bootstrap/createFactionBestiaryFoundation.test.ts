import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "../../data/monsterContentCatalog.js";
import { createFactionBestiaryFoundation } from "./createFactionBestiaryFoundation.js";

describe("createFactionBestiaryFoundation", () => {
  it("returns monster kill knowledge for the requested contexts", () => {
    const foundation = createFactionBestiaryFoundation({
      factionKnowledgeService: {
        isMonsterDiscovered: (monsterId) => monsterId === MONSTER_IDS.keeperWarrior,
        getMonsterKillCount: (monsterId, contextId) => {
          if (monsterId !== MONSTER_IDS.keeperWarrior) return 0;
          if (contextId === undefined) return 7;
          if (contextId === "zone_forest_t3") return 2;
          if (contextId === "zone_swamp_t3") return 3;
          return 0;
        },
      },
    });

    expect(foundation.getKnowledge(MONSTER_IDS.keeperWarrior)).toEqual({
      monsterId: MONSTER_IDS.keeperWarrior,
      discovered: true,
      killCount: 7,
    });
    expect(foundation.getKnowledge(
      MONSTER_IDS.keeperWarrior,
      ["zone_forest_t3", "zone_swamp_t3"],
    )).toEqual({
      monsterId: MONSTER_IDS.keeperWarrior,
      discovered: true,
      killCount: 5,
    });
  });
});
