import type { IslandBuildingId } from "./island.js";

export type IslandProductionTier = 3 | 4 | 5;

export interface IslandUpgradeRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export interface IslandBuildingUpgradeCost {
  readonly silver: number;
  readonly requirements: readonly IslandUpgradeRequirement[];
}

export interface IslandOperationalLevelDefinition {
  readonly level: number;
  readonly maxProductionTier: IslandProductionTier;
  readonly upgradeToNext?: IslandBuildingUpgradeCost;
}

export interface IslandOperationalBuildingProgression {
  readonly buildingId: IslandBuildingId;
  readonly levels: readonly IslandOperationalLevelDefinition[];
}

const T3_REFINED = {
  wood: "item_refined_planks_t3",
  ore: "item_refined_copper_bar_t3",
  hide: "item_refined_leather_t3",
  fiber: "item_refined_cloth_t3",
} as const;

const T4_REFINED = {
  wood: "item_refined_planks_t4",
  ore: "item_refined_metal_bar_t4",
  hide: "item_refined_leather_t4",
  fiber: "item_refined_cloth_t4",
} as const;

function singleFamilyProgression(
  buildingId: IslandBuildingId,
  family: keyof typeof T3_REFINED,
): IslandOperationalBuildingProgression {
  return {
    buildingId,
    levels: [
      {
        level: 1,
        maxProductionTier: 3,
        upgradeToNext: {
          silver: 300,
          requirements: [{ itemId: T3_REFINED[family], quantity: 12 }],
        },
      },
      {
        level: 2,
        maxProductionTier: 4,
        upgradeToNext: {
          silver: 700,
          requirements: [{ itemId: T4_REFINED[family], quantity: 20 }],
        },
      },
      { level: 3, maxProductionTier: 5 },
    ],
  };
}

export const ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS: readonly IslandOperationalBuildingProgression[] = [
  singleFamilyProgression("lumber_camp", "wood"),
  singleFamilyProgression("mine", "ore"),
  singleFamilyProgression("hunting_camp", "hide"),
  singleFamilyProgression("fiber_camp", "fiber"),
  singleFamilyProgression("sawmill", "wood"),
  singleFamilyProgression("smelter", "ore"),
  singleFamilyProgression("tannery", "hide"),
  singleFamilyProgression("weaver", "fiber"),
  {
    buildingId: "workshop",
    levels: [
      {
        level: 1,
        maxProductionTier: 3,
        upgradeToNext: {
          silver: 500,
          requirements: [
            { itemId: T3_REFINED.wood, quantity: 10 },
            { itemId: T3_REFINED.ore, quantity: 10 },
          ],
        },
      },
      {
        level: 2,
        maxProductionTier: 4,
        upgradeToNext: {
          silver: 1200,
          requirements: [
            { itemId: T4_REFINED.wood, quantity: 16 },
            { itemId: T4_REFINED.ore, quantity: 16 },
          ],
        },
      },
      { level: 3, maxProductionTier: 5 },
    ],
  },
] as const;

const PROGRESSION_BY_BUILDING = new Map<IslandBuildingId, IslandOperationalBuildingProgression>(
  ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS.map((entry) => [entry.buildingId, entry] as const),
);

export function getIslandOperationalProgression(
  buildingId: IslandBuildingId,
): IslandOperationalBuildingProgression | undefined {
  return PROGRESSION_BY_BUILDING.get(buildingId);
}

export function getIslandOperationalLevelDefinition(
  buildingId: IslandBuildingId,
  level: number,
): IslandOperationalLevelDefinition | undefined {
  return getIslandOperationalProgression(buildingId)?.levels.find((entry) => entry.level === level);
}

export function getIslandBuildingMaxProductionTier(
  buildingId: IslandBuildingId,
  level: number,
): IslandProductionTier | undefined {
  return getIslandOperationalLevelDefinition(buildingId, level)?.maxProductionTier;
}
