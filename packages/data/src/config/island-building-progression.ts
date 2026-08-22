import type { IslandBuildingId } from "./island.js";
import { getAcademyLevelDefinition } from "./academy-progression.js";
import type { IslandBuildingUpgradeCost } from "./island-progression.js";

export interface IslandUpgradeableLevelDefinition {
  readonly level: number;
  readonly displayTier: number;
  readonly minimumIslandLevel?: number;
  readonly upgradeToNext?: IslandBuildingUpgradeCost;
}

/**
 * Generic mutation/presentation-facing building progression lookup.
 * Only buildings with meaningful authored level progression belong here.
 * Gathering, refining and crafting buildings are construction-only and inherit
 * their maximum production tier from the global island level.
 */
export function getIslandUpgradeableLevelDefinition(
  buildingId: IslandBuildingId,
  level: number,
): IslandUpgradeableLevelDefinition | undefined {
  if (buildingId !== "academy") return undefined;

  const academy = getAcademyLevelDefinition(level);
  if (academy === undefined) return undefined;
  return {
    level: academy.level,
    displayTier: academy.researchTier,
    minimumIslandLevel: academy.minimumIslandLevel,
    ...(academy.upgradeToNext === undefined ? {} : { upgradeToNext: academy.upgradeToNext }),
  };
}
