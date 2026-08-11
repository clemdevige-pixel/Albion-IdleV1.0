import { describe, expect, it } from "vitest";
import { createProgressionFoundation } from "./createProgressionFoundation";
import {
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
} from "../../data/progressionContentCatalog";

describe("createProgressionFoundation", () => {
  it("initializes and discovers every gathering mastery", () => {
    const foundation = createProgressionFoundation();
    const masteries = foundation.progressionOrchestrator
      .getFullProgressionState()
      .masteries;

    for (const masteryId of [
      WOOD_GATHERING_MASTERY_ID,
      ORE_GATHERING_MASTERY_ID,
      HIDE_GATHERING_MASTERY_ID,
      FIBER_GATHERING_MASTERY_ID,
    ]) {
      expect(masteries.get(masteryId)?.isUnlocked).toBe(true);
    }
  });
});
