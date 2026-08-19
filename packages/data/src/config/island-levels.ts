import type { IslandBuildingCategory } from "./island.js";

export type IslandLevel = 1 | 2 | 3 | 4 | 5 | 6;

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
  /** Buildings may never be upgraded above the current island level. */
  readonly maxBuildingLevel: number;
  readonly worldRequirementToReach?: IslandWorldRequirement;
  readonly upgradeCost?: IslandLevelUpgradeCost;
}

export const ISLAND_LEVELS: readonly IslandLevelDefinition[] = [
  {
    level: 1,
    label: "Campement",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    maxBuildingLevel: 1,
  },
  {
    level: 2,
    label: "Domaine artisanal",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    maxBuildingLevel: 2,
    worldRequirementToReach: {
      zoneDefId: "zone_swamp_t3",
      minimumCompletedSegments: 10,
      label: "Terminer Dark Swamp",
    },
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
    maxBuildingLevel: 3,
    worldRequirementToReach: {
      zoneDefId: "zone_mountain_t4",
      minimumCompletedSegments: 10,
      label: "Terminer Frostpeak Mountain",
    },
    upgradeCost: {
      silver: 18000,
      requirements: [
        { itemId: "item_refined_planks_t4", quantity: 30 },
        { itemId: "item_refined_metal_bar_t4", quantity: 30 },
      ],
    },
  },
  {
    level: 4,
    label: "Domaine avancé",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    maxBuildingLevel: 4,
    worldRequirementToReach: {
      zoneDefId: "zone_ironveil_t5",
      minimumCompletedSegments: 10,
      label: "Terminer Ironveil Peaks",
    },
    upgradeCost: {
      silver: 60000,
      requirements: [
        { itemId: "item_refined_planks_t5", quantity: 40 },
        { itemId: "item_refined_metal_bar_t5", quantity: 40 },
      ],
    },
  },
  {
    level: 5,
    label: "Domaine supérieur",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    maxBuildingLevel: 5,
    worldRequirementToReach: {
      zoneDefId: "zone_ashenpeak_t6",
      minimumCompletedSegments: 10,
      label: "Terminer Ashenpeak Mountain",
    },
    upgradeCost: {
      silver: 155000,
      requirements: [
        { itemId: "item_refined_planks_t6", quantity: 50 },
        { itemId: "item_refined_metal_bar_t6", quantity: 50 },
      ],
    },
  },
  {
    level: 6,
    label: "Domaine ancestral",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    maxBuildingLevel: 6,
    worldRequirementToReach: {
      zoneDefId: "zone_doompeak_t7",
      minimumCompletedSegments: 10,
      label: "Terminer Doompeak Mountain",
    },
    upgradeCost: {
      silver: 270000,
      requirements: [
        { itemId: "item_refined_planks_t7", quantity: 60 },
        { itemId: "item_refined_metal_bar_t7", quantity: 60 },
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
