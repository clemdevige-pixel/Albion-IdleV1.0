import type { IslandBuildingCategory } from "./island.js";

export type IslandLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type IslandProductionTier = 3 | 4 | 5 | 6 | 7 | 8;

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
  /** Highest production tier available to constructed gathering/refining/crafting buildings. */
  readonly maxProductionTier: IslandProductionTier;
  /** Upgradeable special-purpose buildings may never exceed this level. */
  readonly maxBuildingLevel: number;
  readonly worldRequirementToReach?: IslandWorldRequirement;
  readonly upgradeCost?: IslandLevelUpgradeCost;
}

const BASE_CATEGORIES = ["workers", "storage", "gathering", "refining", "crafting"] as const satisfies readonly IslandBuildingCategory[];
const DEVELOPED_CATEGORIES = [...BASE_CATEGORIES, "utility"] as const satisfies readonly IslandBuildingCategory[];

export const ISLAND_LEVELS: readonly IslandLevelDefinition[] = [
  {
    level: 1,
    label: "Campement",
    unlockedCategories: BASE_CATEGORIES,
    maxProductionTier: 3,
    maxBuildingLevel: 1,
  },
  {
    level: 2,
    label: "Domaine artisanal",
    unlockedCategories: DEVELOPED_CATEGORIES,
    maxProductionTier: 4,
    maxBuildingLevel: 2,
    worldRequirementToReach: {
      zoneDefId: "zone_swamp_t3",
      minimumCompletedSegments: 10,
      label: "Terminer Dark Swamp",
    },
    upgradeCost: {
      silver: 2_000,
      requirements: [
        { itemId: "item_refined_planks_t3", quantity: 8 },
        { itemId: "item_refined_copper_bar_t3", quantity: 8 },
        { itemId: "item_refined_leather_t3", quantity: 8 },
        { itemId: "item_refined_cloth_t3", quantity: 8 },
      ],
    },
  },
  {
    level: 3,
    label: "Domaine développé",
    unlockedCategories: DEVELOPED_CATEGORIES,
    maxProductionTier: 5,
    maxBuildingLevel: 3,
    worldRequirementToReach: {
      zoneDefId: "zone_mountain_t4",
      minimumCompletedSegments: 10,
      label: "Terminer Frostpeak Mountain",
    },
    upgradeCost: {
      silver: 35_000,
      requirements: [
        { itemId: "item_refined_planks_t4", quantity: 25 },
        { itemId: "item_refined_metal_bar_t4", quantity: 25 },
        { itemId: "item_refined_leather_t4", quantity: 25 },
        { itemId: "item_refined_cloth_t4", quantity: 25 },
      ],
    },
  },
  {
    level: 4,
    label: "Domaine avancé",
    unlockedCategories: DEVELOPED_CATEGORIES,
    maxProductionTier: 6,
    maxBuildingLevel: 4,
    worldRequirementToReach: {
      zoneDefId: "zone_ironveil_t5",
      minimumCompletedSegments: 10,
      label: "Terminer Ironveil Peaks",
    },
    upgradeCost: {
      silver: 120_000,
      requirements: [
        { itemId: "item_refined_planks_t5", quantity: 50 },
        { itemId: "item_refined_metal_bar_t5", quantity: 50 },
        { itemId: "item_refined_leather_t5", quantity: 50 },
        { itemId: "item_refined_cloth_t5", quantity: 50 },
      ],
    },
  },
  {
    level: 5,
    label: "Domaine supérieur",
    unlockedCategories: DEVELOPED_CATEGORIES,
    maxProductionTier: 7,
    maxBuildingLevel: 5,
    worldRequirementToReach: {
      zoneDefId: "zone_ashenpeak_t6",
      minimumCompletedSegments: 10,
      label: "Terminer Ashenpeak Mountain",
    },
    upgradeCost: {
      silver: 315_000,
      requirements: [
        { itemId: "item_refined_planks_t6", quantity: 75 },
        { itemId: "item_refined_metal_bar_t6", quantity: 75 },
        { itemId: "item_refined_leather_t6", quantity: 75 },
        { itemId: "item_refined_cloth_t6", quantity: 75 },
      ],
    },
  },
  {
    level: 6,
    label: "Domaine ancestral",
    unlockedCategories: DEVELOPED_CATEGORIES,
    maxProductionTier: 8,
    maxBuildingLevel: 6,
    worldRequirementToReach: {
      zoneDefId: "zone_doompeak_t7",
      minimumCompletedSegments: 10,
      label: "Terminer Doompeak Mountain",
    },
    upgradeCost: {
      silver: 535_000,
      requirements: [
        { itemId: "item_refined_planks_t7", quantity: 110 },
        { itemId: "item_refined_metal_bar_t7", quantity: 110 },
        { itemId: "item_refined_leather_t7", quantity: 110 },
        { itemId: "item_refined_cloth_t7", quantity: 110 },
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

export function getIslandMaxProductionTier(level: number): IslandProductionTier | undefined {
  return getIslandLevelDefinition(level)?.maxProductionTier;
}
