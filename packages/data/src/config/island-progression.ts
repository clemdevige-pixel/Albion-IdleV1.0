import type { IslandFlexibleConstructionRequirement } from "./island.js";

export interface IslandUpgradeRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export interface IslandBuildingUpgradeCost {
  readonly silver: number;
  readonly requirements: readonly IslandUpgradeRequirement[];
  readonly flexibleRequirement?: IslandFlexibleConstructionRequirement;
}

/**
 * Production tier progression is owned by the global island level.
 * This module now only keeps the shared upgrade-cost contract used by
 * genuinely upgradeable special-purpose buildings such as the Academy.
 */
