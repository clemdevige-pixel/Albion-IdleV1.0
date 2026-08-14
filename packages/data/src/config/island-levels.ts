import type { IslandBuildingCategory } from "./island.js";

export type IslandLevel = 1 | 2 | 3;

export interface IslandLevelRequirement {
  readonly minimumBuildings: number;
  readonly minimumBuildingsAtLevel: number;
  readonly buildingLevel: number;
}

export interface IslandWorldRequirement {
  readonly zoneDefId: string;
  readonly minimumCompletedSegments: number;
  readonly label: string;
}

export interface IslandLevelUpgradeCost {
  readonly silver: number;
  readonly requirements: readonly { readonly itemId: string; readonly quantity: number }[];
}

export interface IslandLevelDefinition {
  readonly level: IslandLevel;
  readonly label: string;
  readonly unlockedCategories: readonly IslandBuildingCategory[];
  readonly requirementToReach?: IslandLevelRequirement;
  readonly worldRequirementToReach?: IslandWorldRequirement;
  readonly upgradeCost?: IslandLevelUpgradeCost;
}

export const ISLAND_LEVELS: readonly IslandLevelDefinition[] = [
  {
    level: 1,
    label: "Campement",
    unlockedCategories: ["workers", "storage", "gathering"],
  },
  {
    level: 2,
    label: "Domaine artisanal",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    // Buildings cannot exceed the current island level. Reaching Lv2 therefore
    // depends only on having developed the Lv1 gathering foundation.
    requirementToReach: { minimumBuildings: 6, minimumBuildingsAtLevel: 0, buildingLevel: 2 },
    // World and economy are deliberately coupled only at tier boundaries.
    // Completing Dark Swamp opens the T4 economic transition; Stone Highlands
    // can then be approached with progressively upgraded T4 equipment.
    worldRequirementToReach: {
      zoneDefId: "zone_swamp_t3",
      minimumCompletedSegments: 10,
      label: "Terminer Dark Swamp",
    },
    // Lv1 cannot refine yet, so this bootstrap cost must use resources obtainable
    // through the hero/workers before the refining category is unlocked.
    upgradeCost: {
      silver: 1000,
      requirements: [
        { itemId: "item_resource_wood_t3", quantity: 40 },
        { itemId: "item_resource_copper_ore_t3", quantity: 40 },
      ],
    },
  },
  {
    level: 3,
    label: "Domaine développé",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    // At island Lv2, production buildings may reach Lv2. Those upgrades are the
    // development proof required before unlocking the final authored island tier.
    // The future Yellow-zone T5 world gate is intentionally authored separately
    // once its exact checkpoint is validated.
    requirementToReach: { minimumBuildings: 10, minimumBuildingsAtLevel: 4, buildingLevel: 2 },
    upgradeCost: {
      silver: 2500,
      requirements: [
        { itemId: "item_refined_planks_t4", quantity: 30 },
        { itemId: "item_refined_metal_bar_t4", quantity: 30 },
      ],
    },
  },
] as const;

export function getIslandLevelDefinition(level: number): IslandLevelDefinition | undefined {
  return ISLAND_LEVELS.find((definition) => definition.level === level);
}

export function getNextIslandLevelDefinition(level: number): IslandLevelDefinition | undefined {
  return getIslandLevelDefinition(level + 1);
}
