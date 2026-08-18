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
  readonly baseAttunementCost: number;
  readonly baseSilverCost: number;
}

export interface AwakenedWeaponBalance {
  readonly tiers: Readonly<Record<AwakenedWeaponTier, AwakenedTierBalance>>;
  readonly traitRolls: Readonly<Record<AwakenedTraitId, AwakenedTraitRollRange>>;
  readonly traitProposalCount: number;
  readonly slotUnlockMultipliers: readonly [number, number, number];
  readonly attunementCapCostMultiplier: number;
  readonly criticalChance: number;
  readonly criticalMultiplier: number;
  readonly strainPerModification: number;
  readonly attunementStrainDivisor: number;
  readonly attunementStrainExponent: number;
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

export interface AwakenedWeaponState {
  readonly itemInstanceId: ItemInstanceId;
  readonly tier: AwakenedWeaponTier;
  readonly storedAttunement: number;
  readonly lifetimeAttunementInvested: number;
  readonly strain: number;
  readonly traits: readonly AwakenedTraitState[];
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

export interface AwakenedWeaponDerivedState {
  readonly actionCost: AwakenedActionCost;
  readonly attunementCap: number;
  readonly unlockedTraitSlots: 1 | 2 | 3;
}
