import type { AwakenedWeaponBalance } from "./types.js";

/**
 * V1 awakened weapon balance baseline from AI_BIBLE/10_SYSTEMS/20_AWAKENED_WEAPON_SYSTEM.
 * System logic must consume this data instead of duplicating numeric rules.
 */
export const DEFAULT_AWAKENED_WEAPON_BALANCE: AwakenedWeaponBalance = {
  tiers: {
    4: { initialAttunementCap: 15_000, baseAttunementCost: 10_000, baseSilverCost: 12_000 },
    5: { initialAttunementCap: 28_000, baseAttunementCost: 19_000, baseSilverCost: 25_000 },
    6: { initialAttunementCap: 35_000, baseAttunementCost: 23_500, baseSilverCost: 32_000 },
    7: { initialAttunementCap: 38_000, baseAttunementCost: 25_500, baseSilverCost: 35_000 },
    8: { initialAttunementCap: 40_000, baseAttunementCost: 26_000, baseSilverCost: 36_000 },
  },
  traitRolls: {
    item_power: { min: 1, max: 3, integer: true },
    damage: { min: 0.2, max: 0.4 },
    ability_power: { min: 0.2, max: 0.4 },
    cooldown_reduction: { min: 0.5, max: 1 },
    max_health: { min: 3, max: 6 },
    armor: { min: 0.5, max: 1 },
    magic_resistance: { min: 0.5, max: 1 },
  },
  traitProposalCount: 3,
  slotUnlockMultipliers: [0, 10, 40],
  attunementCapCostMultiplier: 1.5,
  criticalChance: 0.15,
  criticalMultiplier: 2,
  strainPerModification: 1,
  attunementStrainDivisor: 20,
  attunementStrainExponent: 2,
  silverStrainDivisor: 18,
  silverStrainExponent: 2.2,
  cdrAsymptotePercent: 50,
  cdrCurveConstant: 50,
};
