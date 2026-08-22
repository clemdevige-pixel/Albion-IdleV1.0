import type { DungeonDefinition } from "@game/gameplay";
import { getDungeonResearchUnlockId } from "../../data/dungeonResearchAccessCatalog.js";

interface DungeonDefinitionReadPort {
  getDefinition(definitionId: string): DungeonDefinition | undefined;
}

interface ResearchUnlockReadPort {
  hasUnlock(unlockId: string): boolean;
}

export interface DungeonResearchAccessFoundationDependencies {
  readonly dungeonRuntime: DungeonDefinitionReadPort;
  readonly researchService: ResearchUnlockReadPort;
}

/** Navigation remains ignorant of Academy Research IDs and content semantics. */
export function createDungeonResearchAccessFoundation(
  dependencies: DungeonResearchAccessFoundationDependencies,
) {
  return {
    isDungeonSystemUnlocked(this: void): boolean {
      return dependencies.researchService.hasUnlock(getDungeonResearchUnlockId());
    },
    canAccessDefinition(this: void, definitionId: string): boolean {
      if (dependencies.dungeonRuntime.getDefinition(definitionId) === undefined) return false;
      return dependencies.researchService.hasUnlock(getDungeonResearchUnlockId());
    },
  };
}

export type DungeonResearchAccessFoundation = ReturnType<
  typeof createDungeonResearchAccessFoundation
>;
