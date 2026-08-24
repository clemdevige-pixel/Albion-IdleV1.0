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
 * Generic presentation-facing building progression lookup.
 * Standard production buildings remain construction-only. The Academy keeps
 * authored tier metadata but its level is synchronized by Island Level.
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
  };
}

export function getIslandSynchronizedBuildingLevel(
  buildingId: IslandBuildingId,
  islandLevel: number,
): number | undefined {
  let synchronizedLevel: number | undefined;
  for (let level = 1; ; level += 1) {
    const definition = getIslandUpgradeableLevelDefinition(buildingId, level);
    if (definition === undefined) break;
    const requiredIslandLevel = definition.minimumIslandLevel ?? definition.level;
    if (requiredIslandLevel > islandLevel) break;
    synchronizedLevel = definition.level;
  }
  return synchronizedLevel;
}
