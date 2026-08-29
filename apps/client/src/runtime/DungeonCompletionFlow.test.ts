import { afterEach, describe, expect, it } from "vitest";
import { KEEPER_T4_DUNGEON_ID } from "../data/dungeonContentCatalog.js";
import { combatStopController } from "./CombatStopController.js";
import { dungeonCompletionFlow } from "./DungeonCompletionFlow.js";

function resetFlow(): void {
  dungeonCompletionFlow.dismissForReplay();
  dungeonCompletionFlow.cancel();
  combatStopController.reset();
}

afterEach(resetFlow);

describe("DungeonCompletionFlow", () => {
  it("aggregates the whole run and pauses world combat on clear", () => {
    dungeonCompletionFlow.begin(KEEPER_T4_DUNGEON_ID);
    dungeonCompletionFlow.recordReward({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterId: "normal",
      drops: [
        { itemId: "fragment", kind: "artifact_fragment", quantity: 4 },
        { itemId: "shard", kind: "enchantment_shard", quantity: 3 },
      ],
      completionSilver: 0,
    });
    dungeonCompletionFlow.recordReward({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterId: "boss",
      drops: [
        { itemId: "fragment", kind: "artifact_fragment", quantity: 6 },
        { itemId: "rune", kind: "faction_rune", quantity: 2 },
        { itemId: "artifact", kind: "artifact", quantity: 1 },
      ],
      completionSilver: 1200,
    });

    expect(dungeonCompletionFlow.complete(KEEPER_T4_DUNGEON_ID)).toBe(true);
    expect(dungeonCompletionFlow.getSnapshot()?.rewards).toEqual({
      silver: 1200,
      artifactFragments: 10,
      enchantmentShards: 3,
      factionRunes: 2,
      artifacts: 1,
    });
    expect(combatStopController.isPaused()).toBe(true);
  });

  it("restores a pending completion recap from the existing dungeon save provider payload", () => {
    dungeonCompletionFlow.begin(KEEPER_T4_DUNGEON_ID);
    dungeonCompletionFlow.recordReward({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterId: "boss",
      drops: [{ itemId: "fragment", kind: "artifact_fragment", quantity: 5 }],
      completionSilver: 900,
    });
    dungeonCompletionFlow.complete(KEEPER_T4_DUNGEON_ID);
    const saved = dungeonCompletionFlow.getSaveState();

    dungeonCompletionFlow.dismissForReplay();
    combatStopController.reset();
    dungeonCompletionFlow.restoreSaveState(saved);

    expect(dungeonCompletionFlow.getSnapshot()).toMatchObject({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      rewards: { silver: 900, artifactFragments: 5 },
    });
    expect(combatStopController.isPaused()).toBe(true);
  });
});
