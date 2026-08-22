import {
  ISLAND_BUILDING_IDS,
  PLAYER_ISLAND_CONFIG,
  getAcademyResearchTier,
  type AcademyResearchTier,
  type IslandBuildingId,
} from "@game/data";
import { isDevSandboxMode } from "../devSandbox.js";

interface AcademyIslandPort {
  getBuildingLevel(definitionId: IslandBuildingId): number | undefined;
  getState(): {
    readonly plots: readonly { readonly id: string; readonly buildingInstanceId: string | null }[];
    readonly buildings: readonly { readonly definitionId: IslandBuildingId }[];
  };
  upgradeIslandLevel(): { readonly ok: boolean };
  placeBuilding(definitionId: IslandBuildingId, plotId: string): { readonly ok: boolean };
  upgradeBuilding(definitionId: IslandBuildingId): { readonly ok: boolean };
}

export interface AcademyRuntimeFoundationDependencies {
  readonly islandService: AcademyIslandPort;
}

function seedDevSandboxIsland(islandService: AcademyIslandPort): void {
  if (!isDevSandboxMode()) return;

  while (islandService.upgradeIslandLevel().ok) {
    // Reach the authored maximum island level without spending economy resources.
  }

  const state = islandService.getState();
  const built = new Set(state.buildings.map((building) => building.definitionId));
  const freePlots = state.plots
    .filter((plot) => plot.buildingInstanceId === null)
    .map((plot) => plot.id);
  let freePlotIndex = 0;

  for (const definitionId of ISLAND_BUILDING_IDS) {
    if (built.has(definitionId)) continue;
    const plotId = freePlots[freePlotIndex];
    if (plotId === undefined) {
      throw new Error(`Dev sandbox has no free island plot for ${definitionId}`);
    }
    const result = islandService.placeBuilding(definitionId, plotId);
    if (!result.ok) {
      throw new Error(`Dev sandbox failed to place island building ${definitionId}`);
    }
    freePlotIndex += 1;
  }

  while (islandService.upgradeBuilding("academy").ok) {
    // Academy is the only authored tier-progressing building after the island refactor.
  }

  const finalAcademyLevel = islandService.getBuildingLevel("academy");
  if (finalAcademyLevel === undefined || getAcademyResearchTier(finalAcademyLevel) !== 8) {
    throw new Error("Dev sandbox failed to reach Academy T8");
  }

  if (islandService.getState().plots.length !== PLAYER_ISLAND_CONFIG.plots.length) {
    throw new Error("Dev sandbox island layout diverged from authored config");
  }
}

/**
 * Owns the mapping between the Academy island building and its Research tier.
 * Composition roots consume this capability without knowing the Academy id or tier mapping.
 */
export function createAcademyRuntimeFoundation(
  dependencies: AcademyRuntimeFoundationDependencies,
) {
  seedDevSandboxIsland(dependencies.islandService);

  const getResearchTier = (): AcademyResearchTier | 0 => {
    const level = dependencies.islandService.getBuildingLevel("academy");
    if (level === undefined) return 0;
    return getAcademyResearchTier(level) ?? 0;
  };

  return { getResearchTier };
}

export type AcademyRuntimeFoundation = ReturnType<typeof createAcademyRuntimeFoundation>;
