import type { IslandBuildingUpgradeCost } from "./island-progression.js";

export type AcademyResearchTier = 4 | 5 | 6 | 7 | 8;

export interface AcademyLevelDefinition {
  readonly level: number;
  readonly researchTier: AcademyResearchTier;
  readonly upgradeToNext?: IslandBuildingUpgradeCost;
}

const ACADEMY_REFINED_MATERIALS = {
  4: ["item_refined_planks_t4", "item_refined_metal_bar_t4", "item_refined_leather_t4", "item_refined_cloth_t4"],
  5: ["item_refined_planks_t5", "item_refined_metal_bar_t5", "item_refined_leather_t5", "item_refined_cloth_t5"],
  6: ["item_refined_planks_t6", "item_refined_metal_bar_t6", "item_refined_leather_t6", "item_refined_cloth_t6"],
  7: ["item_refined_planks_t7", "item_refined_metal_bar_t7", "item_refined_leather_t7", "item_refined_cloth_t7"],
} as const;

const ACADEMY_UPGRADE_BALANCE = {
  4: { silver: 5_000, quantityPerFamily: 5 },
  5: { silver: 18_000, quantityPerFamily: 9 },
  6: { silver: 50_000, quantityPerFamily: 14 },
  7: { silver: 85_000, quantityPerFamily: 20 },
} as const;

type AcademyUpgradeSourceTier = keyof typeof ACADEMY_UPGRADE_BALANCE;

function academyUpgrade(sourceTier: AcademyUpgradeSourceTier): IslandBuildingUpgradeCost {
  const balance = ACADEMY_UPGRADE_BALANCE[sourceTier];
  return {
    silver: balance.silver,
    requirements: ACADEMY_REFINED_MATERIALS[sourceTier].map((itemId) => ({
      itemId,
      quantity: balance.quantityPerFamily,
    })),
  };
}

/**
 * Academy progression remains separate from production-building progression.
 * Its level controls Research tier only; it never exposes production capacity.
 */
export const ACADEMY_LEVELS = [
  { level: 1, researchTier: 4, upgradeToNext: academyUpgrade(4) },
  { level: 2, researchTier: 5, upgradeToNext: academyUpgrade(5) },
  { level: 3, researchTier: 6, upgradeToNext: academyUpgrade(6) },
  { level: 4, researchTier: 7, upgradeToNext: academyUpgrade(7) },
  { level: 5, researchTier: 8 },
] as const satisfies readonly AcademyLevelDefinition[];

export function getAcademyLevelDefinition(level: number): AcademyLevelDefinition | undefined {
  return ACADEMY_LEVELS.find((entry) => entry.level === level);
}

export function getAcademyResearchTier(level: number): AcademyResearchTier | undefined {
  return getAcademyLevelDefinition(level)?.researchTier;
}
