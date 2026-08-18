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
  return {
    attunement: roundCurrency(
      tier.baseAttunementCost
        * Math.pow(1 + strain / balance.attunementStrainDivisor, balance.attunementStrainExponent),
    ),
    silver: roundCurrency(
      tier.baseSilverCost
        * Math.pow(1 + strain / balance.silverStrainDivisor, balance.silverStrainExponent),
    ),
  };
}

export function getAwakenedAttunementCap(
  state: Pick<AwakenedWeaponState, "tier" | "strain">,
  balance: AwakenedWeaponBalance,
): number {
  const initialCap = balance.tiers[state.tier].initialAttunementCap;
  const nextCost = getAwakenedActionCost(state, balance).attunement;
  return roundCurrency(Math.max(initialCap, nextCost * balance.attunementCapCostMultiplier));
}

export function getUnlockedAwakenedTraitSlots(
  state: Pick<AwakenedWeaponState, "tier" | "lifetimeAttunementInvested">,
  balance: AwakenedWeaponBalance,
): 1 | 2 | 3 {
  const base = balance.tiers[state.tier].baseAttunementCost;
  const invested = Math.max(0, state.lifetimeAttunementInvested);
  const secondThreshold = base * balance.slotUnlockMultipliers[1];
  const thirdThreshold = base * balance.slotUnlockMultipliers[2];
  if (invested >= thirdThreshold) return 3;
  if (invested >= secondThreshold) return 2;
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
): AwakenedTraitRollResult {
  const range = balance.traitRolls[traitId];
  const valueRoll = Math.min(1, Math.max(0, roll01()));
  const raw = range.min + (range.max - range.min) * valueRoll;
  const baseRoll = range.integer === true ? Math.round(raw) : raw;
  const critical = Math.min(1, Math.max(0, roll01())) < balance.criticalChance;
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
  return {
    actionCost: getAwakenedActionCost(state, balance),
    attunementCap: getAwakenedAttunementCap(state, balance),
    unlockedTraitSlots: getUnlockedAwakenedTraitSlots(state, balance),
  };
}
