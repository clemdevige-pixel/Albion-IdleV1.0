import { getAcademyResearchTier, type AcademyResearchTier, type IslandBuildingId } from "@game/data";

interface AcademyIslandPort {
  getBuildingLevel(definitionId: IslandBuildingId): number | undefined;
}

export interface AcademyRuntimeFoundationDependencies {
  readonly islandService: AcademyIslandPort;
}

/**
 * Owns the mapping between the Academy island building and its Research tier.
 * Composition roots consume this capability without knowing the Academy id or tier mapping.
 */
export function createAcademyRuntimeFoundation(
  dependencies: AcademyRuntimeFoundationDependencies,
) {
  const getResearchTier = (): AcademyResearchTier | 0 => {
    const level = dependencies.islandService.getBuildingLevel("academy");
    if (level === undefined) return 0;
    return getAcademyResearchTier(level) ?? 0;
  };

  return { getResearchTier };
}

export type AcademyRuntimeFoundation = ReturnType<typeof createAcademyRuntimeFoundation>;
