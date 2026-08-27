import type {
  AwakenedActionCost,
  AwakenedTraitId,
  AwakenedTraitRollResult,
  AwakenedWeaponBalance,
  AwakenedWeaponDerivedState,
  AwakenedWeaponState,
} from "./types.js";

function roundCurrency(value: number): number {
  return Math.max(0, Math.round(value));
}

export function getAwakenedActionCost(
  state: Pick<AwakenedWeaponState, "tier" | "strain">,
  balance: AwakenedWeaponBalance,
): AwakenedActionCost {
  const tier = balance.tiers[state.tier];
  const strain = Math.max(0, state.strain);
  const attunementMultiplier = Math.pow(balance.attunementGrowthPerStrain, strain);
  const silverMultiplier = Math.pow(balance.silverGrowthPerStrain, strain);
  return {
    attunement: roundCurrency(tier.baseAttunementCost * attunementMultiplier),
    silver: roundCurrency(tier.baseSilverCost * silverMultiplier),
  };
}

export function getAwakenedAttunementCap(
  state: Pick<AwakenedWeaponState, "tier" | "strain">,
  balance: AwakenedWeaponBalance,
): number {
  const initialCap = balance.tiers[state.tier].initialAttunementCap;
  const strain = Math.max(0, state.strain);
  const strainScaledCap = initialCap * (1 + strain * balance.attunementCapGrowthPerStrain);
  const nextCost = getAwakenedActionCost(state, balance).attunement;
  return roundCurrency(Math.max(
    strainScaledCap,
    nextCost * balance.attunementCapCostMultiplier,
  ));
}

export function getUnlockedAwakenedTraitSlots(
  state: Pick<AwakenedWeaponState, "strain">,
  balance: AwakenedWeaponBalance,
): 1 | 2 | 3 {
  const strain = Math.max(0, state.strain);
  const secondThreshold = balance.slotUnlockStrainThresholds[1];
  const thirdThreshold = balance.slotUnlockStrainThresholds[2];
  if (strain >= thirdThreshold) return 3;
  if (strain >= secondThreshold) return 2;
  return 1;
}

export function getEffectiveCooldownReductionPercent(
  progression: number,
  balance: AwakenedWeaponBalance,
): number {
  const p = Math.max(0, progression);
  if (p <= 0) return 0;
  return balance.cdrAsymptotePercent * p / (p + balance.cdrCurveConstant);
}

export function getEffectiveLifeStealPercent(
  progression: number,
  balance: AwakenedWeaponBalance,
): number {
  const p = Math.max(0, progression);
  if (p <= 0) return 0;
  return balance.lifeStealAsymptotePercent * p / (p + balance.lifeStealCurveConstant);
}

export function applyCooldownReduction(
  baseCooldownSeconds: number,
  progression: number,
  balance: AwakenedWeaponBalance,
): number {
  const base = Math.max(0, baseCooldownSeconds);
  const effective = getEffectiveCooldownReductionPercent(progression, balance);
  return base * (1 - effective / 100);
}

export function getEligibleAwakenedTraits(
  currentTraits: readonly AwakenedTraitId[],
  targetTrait: AwakenedTraitId | undefined,
  balance: AwakenedWeaponBalance,
): readonly AwakenedTraitId[] {
  const all = Object.keys(balance.traitRolls) as AwakenedTraitId[];
  const blocked = new Set(currentTraits.filter((traitId) => traitId !== targetTrait));
  return all.filter((traitId) => !blocked.has(traitId));
}

export function rollAwakenedTrait(
  traitId: AwakenedTraitId,
  roll01: () => number,
  balance: AwakenedWeaponBalance,
  allowCritical = true,
): AwakenedTraitRollResult {
  const range = balance.traitRolls[traitId];
  const valueRoll = Math.min(1, Math.max(0, roll01()));
  const raw = range.min + (range.max - range.min) * valueRoll;
  const baseRoll = range.integer === true ? Math.round(raw) : raw;
  const critical = allowCritical
    && Math.min(1, Math.max(0, roll01())) < balance.criticalChance;
  return {
    traitId,
    baseRoll,
    critical,
    finalGain: baseRoll * (critical ? balance.criticalMultiplier : 1),
  };
}

export function deriveAwakenedWeaponState(
  state: AwakenedWeaponState,
  balance: AwakenedWeaponBalance,
): AwakenedWeaponDerivedState {
  const awakeningAttunementThreshold = balance.tiers[state.tier].awakeningAttunementThreshold;
  return {
    actionCost: getAwakenedActionCost(state, balance),
    attunementCap: getAwakenedAttunementCap(state, balance),
    awakeningAttunementThreshold,
    canAwaken: !state.awakened && state.storedAttunement >= awakeningAttunementThreshold,
    unlockedTraitSlots: getUnlockedAwakenedTraitSlots(state, balance),
  };
}
