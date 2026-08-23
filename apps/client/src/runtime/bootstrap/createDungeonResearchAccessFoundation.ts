import type { DungeonDefinition } from "@game/gameplay";
import {
  getDungeonResearchUnlockId,
  getFactionRuneWorldDropUnlockId,
} from "../../data/dungeonResearchAccessCatalog.js";

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

/** Navigation and combat rewards consume authored Research capabilities only. */
export function createDungeonResearchAccessFoundation(
  dependencies: DungeonResearchAccessFoundationDependencies,
) {
  return {
    isDungeonSystemUnlocked(this: void): boolean {
      return dependencies.researchService.hasUnlock(getDungeonResearchUnlockId());
    },
    isFactionRuneWorldDropUnlocked(this: void): boolean {
      return dependencies.researchService.hasUnlock(getFactionRuneWorldDropUnlockId());
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
