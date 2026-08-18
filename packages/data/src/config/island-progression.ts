import type { IslandBuildingId } from "./island.js";

export type IslandProductionTier = 3 | 4 | 5 | 6 | 7 | 8;
export interface IslandUpgradeRequirement { readonly itemId: string; readonly quantity: number; }
export interface IslandBuildingUpgradeCost { readonly silver: number; readonly requirements: readonly IslandUpgradeRequirement[]; }
export interface IslandOperationalLevelDefinition { readonly level: number; readonly maxProductionTier: IslandProductionTier; readonly upgradeToNext?: IslandBuildingUpgradeCost; }
export interface IslandOperationalBuildingProgression { readonly buildingId: IslandBuildingId; readonly levels: readonly IslandOperationalLevelDefinition[]; }

const REFINED_BY_TIER = {
  3: { wood: "item_refined_planks_t3", ore: "item_refined_copper_bar_t3", hide: "item_refined_leather_t3", fiber: "item_refined_cloth_t3" },
  4: { wood: "item_refined_planks_t4", ore: "item_refined_metal_bar_t4", hide: "item_refined_leather_t4", fiber: "item_refined_cloth_t4" },
  5: { wood: "item_refined_planks_t5", ore: "item_refined_metal_bar_t5", hide: "item_refined_leather_t5", fiber: "item_refined_cloth_t5" },
  6: { wood: "item_refined_planks_t6", ore: "item_refined_metal_bar_t6", hide: "item_refined_leather_t6", fiber: "item_refined_cloth_t6" },
} as const;

type ProductionFamily = keyof (typeof REFINED_BY_TIER)[3];

function singleFamilyProgression(buildingId: IslandBuildingId, family: ProductionFamily): IslandOperationalBuildingProgression {
  return {
    buildingId,
    levels: [
      { level: 1, maxProductionTier: 3, upgradeToNext: { silver: 300, requirements: [{ itemId: REFINED_BY_TIER[3][family], quantity: 12 }] } },
      { level: 2, maxProductionTier: 4, upgradeToNext: { silver: 700, requirements: [{ itemId: REFINED_BY_TIER[4][family], quantity: 20 }] } },
      { level: 3, maxProductionTier: 5, upgradeToNext: { silver: 1500, requirements: [{ itemId: REFINED_BY_TIER[5][family], quantity: 30 }] } },
      { level: 4, maxProductionTier: 6, upgradeToNext: { silver: 3000, requirements: [{ itemId: REFINED_BY_TIER[6][family], quantity: 40 }] } },
      { level: 5, maxProductionTier: 7 },
    ],
  };
}

export const ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS: readonly IslandOperationalBuildingProgression[] = [
  singleFamilyProgression("lumber_camp", "wood"), singleFamilyProgression("mine", "ore"), singleFamilyProgression("hunting_camp", "hide"), singleFamilyProgression("fiber_camp", "fiber"),
  singleFamilyProgression("sawmill", "wood"), singleFamilyProgression("smelter", "ore"), singleFamilyProgression("tannery", "hide"), singleFamilyProgression("weaver", "fiber"),
  {
    buildingId: "workshop",
    levels: [
      { level: 1, maxProductionTier: 3, upgradeToNext: { silver: 500, requirements: [{ itemId: REFINED_BY_TIER[3].wood, quantity: 10 }, { itemId: REFINED_BY_TIER[3].ore, quantity: 10 }] } },
      { level: 2, maxProductionTier: 4, upgradeToNext: { silver: 1200, requirements: [{ itemId: REFINED_BY_TIER[4].wood, quantity: 16 }, { itemId: REFINED_BY_TIER[4].ore, quantity: 16 }] } },
      { level: 3, maxProductionTier: 5, upgradeToNext: { silver: 2500, requirements: [{ itemId: REFINED_BY_TIER[5].wood, quantity: 24 }, { itemId: REFINED_BY_TIER[5].ore, quantity: 24 }] } },
      { level: 4, maxProductionTier: 6, upgradeToNext: { silver: 5000, requirements: [{ itemId: REFINED_BY_TIER[6].wood, quantity: 32 }, { itemId: REFINED_BY_TIER[6].ore, quantity: 32 }] } },
      { level: 5, maxProductionTier: 7 },
    ],
  },
] as const;

const PROGRESSION_BY_BUILDING = new Map<IslandBuildingId, IslandOperationalBuildingProgression>(ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS.map((entry) => [entry.buildingId, entry] as const));
export function getIslandOperationalProgression(buildingId: IslandBuildingId): IslandOperationalBuildingProgression | undefined { return PROGRESSION_BY_BUILDING.get(buildingId); }
export function getIslandOperationalLevelDefinition(buildingId: IslandBuildingId, level: number): IslandOperationalLevelDefinition | undefined { return getIslandOperationalProgression(buildingId)?.levels.find((entry) => entry.level === level); }
export function getIslandBuildingMaxProductionTier(buildingId: IslandBuildingId, level: number): IslandProductionTier | undefined { return getIslandOperationalLevelDefinition(buildingId, level)?.maxProductionTier; }
