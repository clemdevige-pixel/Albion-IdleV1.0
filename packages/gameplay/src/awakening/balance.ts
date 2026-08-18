import type { AwakenedWeaponBalance } from "./types.js";

/**
 * V1 awakened weapon balance baseline from AI_BIBLE/10_SYSTEMS/20_AWAKENED_WEAPON_SYSTEM.
 * System logic must consume this data instead of duplicating numeric rules.
 */
export const DEFAULT_AWAKENED_WEAPON_BALANCE: AwakenedWeaponBalance = {
  tiers: {
    4: { initialAttunementCap: 15_000, awakeningAttunementThreshold: 5_000, baseAttunementCost: 1_000, baseSilverCost: 12_000 },
    5: { initialAttunementCap: 28_000, awakeningAttunementThreshold: 10_000, baseAttunementCost: 2_000, baseSilverCost: 24_000 },
    6: { initialAttunementCap: 35_000, awakeningAttunementThreshold: 15_000, baseAttunementCost: 3_000, baseSilverCost: 36_000 },
    7: { initialAttunementCap: 38_000, awakeningAttunementThreshold: 20_000, baseAttunementCost: 4_000, baseSilverCost: 48_000 },
    8: { initialAttunementCap: 40_000, awakeningAttunementThreshold: 25_000, baseAttunementCost: 5_000, baseSilverCost: 60_000 },
  },
  traitRolls: {
    item_power: { min: 1, max: 3, integer: true },
    damage: { min: 0.2, max: 0.4 },
    ability_power: { min: 0.2, max: 0.4 },
    cooldown_reduction: { min: 0.5, max: 1 },
    max_health: { min: 3, max: 6 },
    armor: { min: 0.5, max: 1 },
    magic_resistance: { min: 0.5, max: 1 },
    fame_bonus: { min: 0.5, max: 1 },
  },
  traitProposalCount: 3,
  slotUnlockStrainThresholds: [0, 10, 30],
  attunementCapCostMultiplier: 1.5,
  // Each modification increases storage by 2.5% of the tier's initial cap.
  attunementCapGrowthPerStrain: 0.025,
  criticalChance: 0.15,
  criticalMultiplier: 2,
  strainPerModification: 1,
  // Attunement multiplier = 1 + strain*a + strain^2*b.
  // Approx.: x1.30 @10, x1.93 @20, x2.90 @30, x5.83 @50, x19 @100.
  attunementStrainLinearCoefficient: 0.01333,
  attunementStrainQuadraticCoefficient: 0.001667,
  // Silver multiplier = 1 + strain*a + strain^2*b.
  // Approx.: x1.30 @10, x2.50 @30, x4.50 @50, x8.125 @75, x13 @100.
  silverStrainLinearCoefficient: 0.02,
  silverStrainQuadraticCoefficient: 0.001,
  cdrAsymptotePercent: 50,
  cdrCurveConstant: 50,
};
