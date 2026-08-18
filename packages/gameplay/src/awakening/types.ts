import type { ItemInstanceId } from "../inventory/types.js";

export type AwakenedWeaponTier = 4 | 5 | 6 | 7 | 8;

export type AwakenedTraitId =
  | "item_power"
  | "damage"
  | "ability_power"
  | "cooldown_reduction"
  | "max_health"
  | "armor"
  | "magic_resistance";

export interface AwakenedTraitRollRange {
  readonly min: number;
  readonly max: number;
  readonly integer?: boolean;
}

export interface AwakenedTierBalance {
  readonly initialAttunementCap: number;
  readonly awakeningAttunementThreshold: number;
  readonly baseAttunementCost: number;
  readonly baseSilverCost: number;
}

export interface AwakenedWeaponBalance {
  readonly tiers: Readonly<Record<AwakenedWeaponTier, AwakenedTierBalance>>;
  readonly traitRolls: Readonly<Record<AwakenedTraitId, AwakenedTraitRollRange>>;
  readonly traitProposalCount: number;
  readonly slotUnlockStrainThresholds: readonly [number, number, number];
  readonly attunementCapCostMultiplier: number;
  readonly criticalChance: number;
  readonly criticalMultiplier: number;
  readonly strainPerModification: number;
  readonly attunementStrainLinearCoefficient: number;
  readonly attunementStrainQuadraticCoefficient: number;
  readonly silverStrainDivisor: number;
  readonly silverStrainExponent: number;
  readonly cdrAsymptotePercent: number;
  readonly cdrCurveConstant: number;
}

export interface AwakenedTraitState {
  readonly traitId: AwakenedTraitId;
  /** Accumulated authored trait value. For CDR this is hidden internal progression P. */
  readonly value: number;
}

export interface AwakenedActionCost {
  readonly attunement: number;
  readonly silver: number;
}

export interface AwakenedTraitRollResult {
  readonly traitId: AwakenedTraitId;
  readonly baseRoll: number;
  readonly critical: boolean;
  readonly finalGain: number;
}

export type AwakenedTraitOfferKind = "fill" | "reroll";

/**
 * Paid offer persisted on the weapon so reopening/reloading cannot generate
 * free alternative proposals. Choosing from an existing offer never pays twice.
 */
export interface AwakenedTraitOffer {
  readonly kind: AwakenedTraitOfferKind;
  readonly targetIndex: number;
  readonly proposals: readonly AwakenedTraitRollResult[];
}

export interface AwakenedWeaponState {
  readonly itemInstanceId: ItemInstanceId;
  readonly tier: AwakenedWeaponTier;
  /** .4 exists before Awakening; traits and modification actions require this flag. */
  readonly awakened: boolean;
  readonly storedAttunement: number;
  readonly lifetimeAttunementInvested: number;
  readonly strain: number;
  readonly traits: readonly AwakenedTraitState[];
  readonly pendingTraitOffer?: AwakenedTraitOffer;
}

export interface AwakenedWeaponDerivedState {
  readonly actionCost: AwakenedActionCost;
  readonly attunementCap: number;
  readonly awakeningAttunementThreshold: number;
  readonly canAwaken: boolean;
  readonly unlockedTraitSlots: 1 | 2 | 3;
}

export type AwakenedFailureReason =
  | "weapon_not_registered"
  | "weapon_already_registered"
  | "weapon_not_awakened"
  | "weapon_already_awakened"
  | "awakening_threshold_not_reached"
  | "invalid_amount"
  | "invalid_trait_index"
  | "trait_slot_locked"
  | "trait_offer_pending"
  | "no_trait_offer_pending"
  | "invalid_trait_choice"
  | "choice_required"
  | "insufficient_attunement"
  | "insufficient_silver";

export type AwakenedResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: AwakenedFailureReason };

export interface AwakenedAttunementGain {
  readonly requested: number;
  readonly stored: number;
  readonly discardedAtCap: number;
  readonly balance: number;
  readonly cap: number;
}

export interface AwakenedModificationOutcome {
  readonly state: AwakenedWeaponState;
  readonly roll: AwakenedTraitRollResult;
  readonly cost: AwakenedActionCost;
}
