import type { IslandBuildingId, IslandFlexibleConstructionRequirement } from "./island.js";

export type IslandProductionTier = 3 | 4 | 5 | 6 | 7 | 8;
export interface IslandUpgradeRequirement { readonly itemId: string; readonly quantity: number; }
export interface IslandBuildingUpgradeCost {
  readonly silver: number;
  readonly requirements: readonly IslandUpgradeRequirement[];
  readonly flexibleRequirement?: IslandFlexibleConstructionRequirement;
}
export interface IslandOperationalLevelDefinition { readonly level: number; readonly maxProductionTier: IslandProductionTier; readonly upgradeToNext?: IslandBuildingUpgradeCost; }
export interface IslandOperationalBuildingProgression { readonly buildingId: IslandBuildingId; readonly levels: readonly IslandOperationalLevelDefinition[]; }

const REFINED_BY_TIER = {
  3: { wood: "item_refined_planks_t3", ore: "item_refined_copper_bar_t3", hide: "item_refined_leather_t3", fiber: "item_refined_cloth_t3" },
  4: { wood: "item_refined_planks_t4", ore: "item_refined_metal_bar_t4", hide: "item_refined_leather_t4", fiber: "item_refined_cloth_t4" },
  5: { wood: "item_refined_planks_t5", ore: "item_refined_metal_bar_t5", hide: "item_refined_leather_t5", fiber: "item_refined_cloth_t5" },
  6: { wood: "item_refined_planks_t6", ore: "item_refined_metal_bar_t6", hide: "item_refined_leather_t6", fiber: "item_refined_cloth_t6" },
  7: { wood: "item_refined_planks_t7", ore: "item_refined_metal_bar_t7", hide: "item_refined_leather_t7", fiber: "item_refined_cloth_t7" },
} as const;

type ProductionFamily = keyof (typeof REFINED_BY_TIER)[3];
const MONO_COST_BY_SOURCE_TIER = { 3: 15, 4: 40, 5: 70, 6: 110, 7: 160 } as const;
const SILVER_BY_SOURCE_TIER = { 3: 300, 4: 700, 5: 1500, 6: 3000, 7: 6000 } as const;
const WORKSHOP_SILVER_BY_SOURCE_TIER = { 3: 500, 4: 1200, 5: 2500, 6: 5000, 7: 10000 } as const;

function singleFamilyProgression(buildingId: IslandBuildingId, family: ProductionFamily): IslandOperationalBuildingProgression {
  return {
    buildingId,
    levels: [3, 4, 5, 6, 7].map((sourceTier, index) => ({
      level: index + 1,
      maxProductionTier: sourceTier,
      upgradeToNext: {
        silver: SILVER_BY_SOURCE_TIER[sourceTier as keyof typeof SILVER_BY_SOURCE_TIER],
        requirements: [{
          itemId: REFINED_BY_TIER[sourceTier as keyof typeof REFINED_BY_TIER][family],
          quantity: MONO_COST_BY_SOURCE_TIER[sourceTier as keyof typeof MONO_COST_BY_SOURCE_TIER],
        }],
      },
    })).concat([{ level: 6, maxProductionTier: 8 }]),
  };
}

function workshopUpgrade(sourceTier: 3 | 4 | 5 | 6 | 7): IslandBuildingUpgradeCost {
  return {
    silver: WORKSHOP_SILVER_BY_SOURCE_TIER[sourceTier],
    requirements: [],
    flexibleRequirement: {
      itemIds: Object.values(REFINED_BY_TIER[sourceTier]),
      totalQuantity: MONO_COST_BY_SOURCE_TIER[sourceTier],
      minimumDistinctItemIds: 3,
    },
  };
}

export const ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS: readonly IslandOperationalBuildingProgression[] = [
  singleFamilyProgression("lumber_camp", "wood"), singleFamilyProgression("mine", "ore"), singleFamilyProgression("hunting_camp", "hide"), singleFamilyProgression("fiber_camp", "fiber"),
  singleFamilyProgression("sawmill", "wood"), singleFamilyProgression("smelter", "ore"), singleFamilyProgression("tannery", "hide"), singleFamilyProgression("weaver", "fiber"),
  {
    buildingId: "workshop",
    levels: [
      { level: 1, maxProductionTier: 3, upgradeToNext: workshopUpgrade(3) },
      { level: 2, maxProductionTier: 4, upgradeToNext: workshopUpgrade(4) },
      { level: 3, maxProductionTier: 5, upgradeToNext: workshopUpgrade(5) },
      { level: 4, maxProductionTier: 6, upgradeToNext: workshopUpgrade(6) },
      { level: 5, maxProductionTier: 7, upgradeToNext: workshopUpgrade(7) },
      { level: 6, maxProductionTier: 8 },
    ],
  },
] as const;

const PROGRESSION_BY_BUILDING = new Map<IslandBuildingId, IslandOperationalBuildingProgression>(ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS.map((entry) => [entry.buildingId, entry] as const));
export function getIslandOperationalProgression(buildingId: IslandBuildingId): IslandOperationalBuildingProgression | undefined { return PROGRESSION_BY_BUILDING.get(buildingId); }
export function getIslandOperationalLevelDefinition(buildingId: IslandBuildingId, level: number): IslandOperationalLevelDefinition | undefined { return getIslandOperationalProgression(buildingId)?.levels.find((entry) => entry.level === level); }
export function getIslandBuildingMaxProductionTier(buildingId: IslandBuildingId, level: number): IslandProductionTier | undefined { return getIslandOperationalLevelDefinition(buildingId, level)?.maxProductionTier; }
