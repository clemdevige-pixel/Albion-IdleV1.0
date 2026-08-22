import type { IslandBuildingId } from "./island.js";
import { getAcademyLevelDefinition } from "./academy-progression.js";
import { getIslandOperationalLevelDefinition, type IslandBuildingUpgradeCost } from "./island-progression.js";

export interface IslandUpgradeableLevelDefinition {
  readonly level: number;
  readonly displayTier: number;
  readonly minimumIslandLevel?: number;
  readonly upgradeToNext?: IslandBuildingUpgradeCost;
}

/**
 * Generic mutation/presentation-facing building progression lookup.
 * Domain-specific progression fields stay in their owning catalogs.
 */
export function getIslandUpgradeableLevelDefinition(
  buildingId: IslandBuildingId,
  level: number,
): IslandUpgradeableLevelDefinition | undefined {
  if (buildingId === "academy") {
    const academy = getAcademyLevelDefinition(level);
    if (academy === undefined) return undefined;
    return {
      level: academy.level,
      displayTier: academy.researchTier,
      minimumIslandLevel: academy.minimumIslandLevel,
      ...(academy.upgradeToNext === undefined ? {} : { upgradeToNext: academy.upgradeToNext }),
    };
  }

  const operational = getIslandOperationalLevelDefinition(buildingId, level);
  if (operational === undefined) return undefined;
  return {
    level: operational.level,
    displayTier: operational.maxProductionTier,
    ...(operational.upgradeToNext === undefined ? {} : { upgradeToNext: operational.upgradeToNext }),
  };
}
