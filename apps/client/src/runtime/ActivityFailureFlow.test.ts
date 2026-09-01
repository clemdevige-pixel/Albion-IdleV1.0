import { afterEach, describe, expect, it } from "vitest";
import { TowerProgressionService } from "@game/gameplay";
import { KEEPER_T4_DUNGEON_ID } from "../data/dungeonContentCatalog.js";
import { activityFailureFlow } from "./ActivityFailureFlow.js";
import { dungeonCompletionFlow } from "./DungeonCompletionFlow.js";
import { TowerCombatEncounterSource } from "./TowerCombatEncounterSource.js";
import { TowerCombatRuntimeRouter } from "./TowerCombatRuntimeRouter.js";

afterEach(() => {
  activityFailureFlow.dismiss();
  dungeonCompletionFlow.cancel();
});

describe("ActivityFailureFlow", () => {
  it("publishes dungeon encounter progress and rewards collected before defeat", () => {
    dungeonCompletionFlow.begin(KEEPER_T4_DUNGEON_ID);
    dungeonCompletionFlow.recordReward({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterId: "normal",
      drops: [{ itemId: "fragment", kind: "artifact_fragment", quantity: 4 }],
      completionSilver: 250,
    });

    expect(dungeonCompletionFlow.fail(KEEPER_T4_DUNGEON_ID, 2)).toBe(true);
    expect(activityFailureFlow.getSnapshot()).toMatchObject({
      kind: "dungeon",
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterNumber: 3,
      rewards: {
        silver: 250,
        artifactFragments: 4,
      },
    });
  });

  it("publishes the failed Tower floor while progression returns to its checkpoint", () => {
    const progression = new TowerProgressionService("tower-failure-recap-seed");
    for (let floor = 1; floor <= 7; floor += 1) progression.clearCurrentFloor(floor);
    const router = new TowerCombatRuntimeRouter(
      progression,
      new TowerCombatEncounterSource(progression),
    );

    expect(progression.getSnapshot()).toMatchObject({ currentFloor: 8, checkpointFloor: 6 });
    expect(router.start()).toBe(true);
    router.onDefeat(() => undefined);

    expect(progression.getSnapshot()).toMatchObject({ currentFloor: 6, checkpointFloor: 6 });
    expect(activityFailureFlow.getSnapshot()).toMatchObject({
      kind: "tower",
      floor: 8,
      highestClearedFloor: 7,
      checkpointFloor: 6,
    });
  });
});
