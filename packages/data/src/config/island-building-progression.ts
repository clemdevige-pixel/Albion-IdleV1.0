import type { IslandBuildingId } from "./island.js";
import { getAcademyLevelDefinition } from "./academy-progression.js";
import { getIslandOperationalLevelDefinition, type IslandBuildingUpgradeCost } from "./island-progression.js";

export interface IslandUpgradeableLevelDefinition {
  readonly level: number;
  readonly minimumIslandLevel?: number;
  readonly upgradeToNext?: IslandBuildingUpgradeCost;
}

/**
 * Generic mutation-facing building progression lookup.
 * Production-specific tier data remains owned by island-progression, while
 * utility buildings keep their own progression catalogs.
 */
export function getIslandUpgradeableLevelDefinition(
  buildingId: IslandBuildingId,
  level: number,
): IslandUpgradeableLevelDefinition | undefined {
  if (buildingId === "academy") return getAcademyLevelDefinition(level);
  return getIslandOperationalLevelDefinition(buildingId, level);
}
