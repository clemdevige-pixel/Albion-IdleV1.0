import {
  DestinyBoardService,
  ExperienceService,
  FameService,
  MasteryService,
  ProgressionOrchestrator,
} from "@game/gameplay";
import {
  DESTINY_NODES,
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  MASTERY_DEFINITIONS,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
} from "../../data/progressionContentCatalog.js";

/** Framework-agnostic progression and mastery service assembly. */
export function createProgressionFoundation() {
  const experienceService = new ExperienceService();
  const fameService = new FameService(experienceService);
  const masteryService = new MasteryService(experienceService);
  const destinyBoardService = new DestinyBoardService(experienceService);
  const progressionOrchestrator = new ProgressionOrchestrator(
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
  );

  progressionOrchestrator.initialize({
    masteryDefinitions: MASTERY_DEFINITIONS,
    destinyNodes: DESTINY_NODES,
  });

  for (const masteryId of [
    WOOD_GATHERING_MASTERY_ID,
    ORE_GATHERING_MASTERY_ID,
    HIDE_GATHERING_MASTERY_ID,
    FIBER_GATHERING_MASTERY_ID,
  ]) {
    masteryService.discoverMastery(masteryId);
  }

  return {
    experienceService,
    fameService,
    masteryService,
    destinyBoardService,
    progressionOrchestrator,
  };
}

export type ProgressionFoundation = ReturnType<
  typeof createProgressionFoundation
>;
