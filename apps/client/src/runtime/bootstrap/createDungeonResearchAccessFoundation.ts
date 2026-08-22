import type { DungeonDefinition } from "@game/gameplay";
import { getDungeonFamilyResearchUnlockId } from "../../data/dungeonResearchAccessCatalog.js";

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

/**
 * Resolves authored Research access requirements for dungeon families.
 * Navigation remains ignorant of faction identities and Research unlock IDs.
 */
export function createDungeonResearchAccessFoundation(
  dependencies: DungeonResearchAccessFoundationDependencies,
) {
  return {
    canAccessDefinition(this: void, definitionId: string): boolean {
      const definition = dependencies.dungeonRuntime.getDefinition(definitionId);
      if (definition === undefined) return false;
      const requiredUnlockId = getDungeonFamilyResearchUnlockId(definition.faction);
      return requiredUnlockId === undefined || dependencies.researchService.hasUnlock(requiredUnlockId);
    },
  };
}

export type DungeonResearchAccessFoundation = ReturnType<
  typeof createDungeonResearchAccessFoundation
>;
