export type {
  AwakenedActionCost,
  AwakenedAttunementGain,
  AwakenedFailureReason,
  AwakenedModificationOutcome,
  AwakenedResult,
  AwakenedTierBalance,
  AwakenedTraitId,
  AwakenedTraitOffer,
  AwakenedTraitOfferKind,
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
  getEffectiveLifeStealPercent,
  getEligibleAwakenedTraits,
  getUnlockedAwakenedTraitSlots,
  rollAwakenedTrait,
} from "./calculations.js";
export { createFreshAwakenedWeaponState, resetAwakenedWeaponState } from "./state.js";
export { AwakenedWeaponService } from "./awakening-service.js";
export type { AwakenedWeaponServiceOptions } from "./awakening-service.js";
export { AwakeningSaveProvider } from "./awakening-save-provider.js";
