export type {
  AwakenedActionCost,
  AwakenedTierBalance,
  AwakenedTraitId,
  AwakenedTraitRollRange,
  AwakenedTraitRollResult,
  AwakenedTraitState,
  AwakenedWeaponBalance,
  AwakenedWeaponDerivedState,
  AwakenedWeaponState,
  AwakenedWeaponTier,
} from "./types.js";
export { DEFAULT_AWAKENED_WEAPON_BALANCE } from "./balance.js";
export {
  applyCooldownReduction,
  deriveAwakenedWeaponState,
  getAwakenedActionCost,
  getAwakenedAttunementCap,
  getEffectiveCooldownReductionPercent,
  getEligibleAwakenedTraits,
  getUnlockedAwakenedTraitSlots,
  rollAwakenedTrait,
} from "./calculations.js";
export { createFreshAwakenedWeaponState, resetAwakenedWeaponState } from "./state.js";
