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
type UpgradeSourceTier = 3 | 4 | 5 | 6 | 7;
const UPGRADE_SOURCE_TIERS = [3, 4, 5, 6, 7] as const satisfies readonly UpgradeSourceTier[];
const MONO_COST_BY_SOURCE_TIER = { 3: 15, 4: 40, 5: 70, 6: 110, 7: 160 } as const satisfies Record<UpgradeSourceTier, number>;
const WORKSHOP_FAMILY_COST_BY_SOURCE_TIER = { 3: 4, 4: 10, 5: 18, 6: 28, 7: 40 } as const satisfies Record<UpgradeSourceTier, number>;
const SILVER_BY_SOURCE_TIER = { 3: 300, 4: 4500, 5: 14500, 6: 38000, 7: 65000 } as const satisfies Record<UpgradeSourceTier, number>;
const WORKSHOP_SILVER_BY_SOURCE_TIER = { 3: 500, 4: 6000, 5: 24000, 6: 66000, 7: 110000 } as const satisfies Record<UpgradeSourceTier, number>;

function singleFamilyUpgrade(sourceTier: UpgradeSourceTier, family: ProductionFamily): IslandBuildingUpgradeCost {
  return {
    silver: SILVER_BY_SOURCE_TIER[sourceTier],
    requirements: [{ itemId: REFINED_BY_TIER[sourceTier][family], quantity: MONO_COST_BY_SOURCE_TIER[sourceTier] }],
  };
}

function singleFamilyProgression(buildingId: IslandBuildingId, family: ProductionFamily): IslandOperationalBuildingProgression {
  const levels: IslandOperationalLevelDefinition[] = UPGRADE_SOURCE_TIERS.map((sourceTier, index) => ({
    level: index + 1,
    maxProductionTier: sourceTier,
    upgradeToNext: singleFamilyUpgrade(sourceTier, family),
  }));
  levels.push({ level: 6, maxProductionTier: 8 });
  return { buildingId, levels };
}

function workshopUpgrade(sourceTier: UpgradeSourceTier): IslandBuildingUpgradeCost {
  const quantityPerFamily = WORKSHOP_FAMILY_COST_BY_SOURCE_TIER[sourceTier];
  return {
    silver: WORKSHOP_SILVER_BY_SOURCE_TIER[sourceTier],
    requirements: Object.values(REFINED_BY_TIER[sourceTier]).map((itemId) => ({ itemId, quantity: quantityPerFamily })),
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
  {
    buildingId: "academy",
    levels: [
      { level: 1, maxProductionTier: 4 },
    ],
  },
] as const;

const PROGRESSION_BY_BUILDING = new Map<IslandBuildingId, IslandOperationalBuildingProgression>(ISLAND_OPERATIONAL_BUILDING_PROGRESSIONS.map((entry) => [entry.buildingId, entry] as const));
export function getIslandOperationalProgression(buildingId: IslandBuildingId): IslandOperationalBuildingProgression | undefined { return PROGRESSION_BY_BUILDING.get(buildingId); }
export function getIslandOperationalLevelDefinition(buildingId: IslandBuildingId, level: number): IslandOperationalLevelDefinition | undefined { return getIslandOperationalProgression(buildingId)?.levels.find((entry) => entry.level === level); }
export function getIslandBuildingMaxProductionTier(buildingId: IslandBuildingId, level: number): IslandProductionTier | undefined { return getIslandOperationalLevelDefinition(buildingId, level)?.maxProductionTier; }
