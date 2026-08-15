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
    // The first island loop must teach the complete active T3 production chain:
    // gather -> refine -> craft. Higher island levels gate development and
    // production tiers, not access to these foundational systems.
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
  },
  {
    level: 2,
    label: "Domaine artisanal",
    unlockedCategories: ["workers", "storage", "gathering", "refining", "crafting"],
    requirementToReach: { minimumBuildings: 6, minimumBuildingsAtLevel: 0, buildingLevel: 2 },
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
    requirementToReach: { minimumBuildings: 10, minimumBuildingsAtLevel: 4, buildingLevel: 2 },
    worldRequirementToReach: {
      zoneDefId: "zone_mountain_t4",
      minimumCompletedSegments: 10,
      label: "Terminer Frostpeak Mountain",
    },
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
