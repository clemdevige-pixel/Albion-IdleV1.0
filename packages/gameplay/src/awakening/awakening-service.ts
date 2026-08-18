import type { CurrencyService } from "../currency/currency-service.js";
import type { WalletId } from "../currency/types.js";
import type { ItemInstanceId } from "../inventory/types.js";
import { DEFAULT_AWAKENED_WEAPON_BALANCE } from "./balance.js";
import {
  deriveAwakenedWeaponState,
  getEffectiveCooldownReductionPercent,
  getEligibleAwakenedTraits,
  rollAwakenedTrait,
} from "./calculations.js";
import { createFreshAwakenedWeaponState, resetAwakenedWeaponState } from "./state.js";
import type {
  AwakenedActionCost,
  AwakenedAttunementGain,
  AwakenedFailureReason,
  AwakenedModificationOutcome,
  AwakenedResult,
  AwakenedTraitId,
  AwakenedTraitOffer,
  AwakenedTraitRollRange,
  AwakenedWeaponBalance,
  AwakenedWeaponDerivedState,
  AwakenedWeaponState,
  AwakenedWeaponTier,
} from "./types.js";

function ok<T>(value: T): AwakenedResult<T> {
  return { ok: true, value };
}

function fail<T>(reason: AwakenedFailureReason): AwakenedResult<T> {
  return { ok: false, reason };
}

export interface AwakenedWeaponServiceOptions {
  readonly silverCurrencyId: string;
  readonly silverSpendSource?: string;
  readonly balance?: AwakenedWeaponBalance;
}

/**
 * Instance-scoped .4 progression domain service.
 * Owns only awakened state; Silver remains in CurrencyService and combat stats
 * remain in the existing equipment/stat pipeline.
 */
export class AwakenedWeaponService {
  private readonly states = new Map<ItemInstanceId, AwakenedWeaponState>();
  private readonly lastImprovementOutcomes = new Map<ItemInstanceId, AwakenedModificationOutcome>();
  private readonly balance: AwakenedWeaponBalance;

  constructor(
    private readonly currencyService: CurrencyService,
    private readonly options: AwakenedWeaponServiceOptions,
  ) {
    this.balance = options.balance ?? DEFAULT_AWAKENED_WEAPON_BALANCE;
  }

  registerFresh(itemInstanceId: ItemInstanceId, tier: AwakenedWeaponTier): AwakenedResult<AwakenedWeaponState> {
    if (this.states.has(itemInstanceId)) return fail("weapon_already_registered");
    const state = createFreshAwakenedWeaponState(itemInstanceId, tier);
    this.states.set(itemInstanceId, state);
    this.lastImprovementOutcomes.delete(itemInstanceId);
    return ok(state);
  }

  has(itemInstanceId: ItemInstanceId): boolean {
    return this.states.has(itemInstanceId);
  }

  getState(itemInstanceId: ItemInstanceId): AwakenedWeaponState | undefined {
    return this.states.get(itemInstanceId);
  }

  getDerivedState(itemInstanceId: ItemInstanceId): AwakenedWeaponDerivedState | undefined {
    const state = this.states.get(itemInstanceId);
    return state === undefined ? undefined : deriveAwakenedWeaponState(state, this.balance);
  }

  /** Raw accumulated trait value. Unawakened/missing weapons resolve to zero. */
  getTraitValue(itemInstanceId: ItemInstanceId, traitId: AwakenedTraitId): number {
    const state = this.states.get(itemInstanceId);
    if (state?.awakened !== true) return 0;
    return state.traits.find((trait) => trait.traitId === traitId)?.value ?? 0;
  }

  getTraitRollRange(traitId: AwakenedTraitId): AwakenedTraitRollRange {
    return this.balance.traitRolls[traitId];
  }

  getCriticalChance(): number {
    return this.balance.criticalChance;
  }

  getLastImprovementOutcome(itemInstanceId: ItemInstanceId): AwakenedModificationOutcome | undefined {
    return this.lastImprovementOutcomes.get(itemInstanceId);
  }

  /** Returns the player-facing value for a stored trait value. */
  getDisplayTraitValue(traitId: AwakenedTraitId, value: number): number {
    return traitId === "cooldown_reduction"
      ? getEffectiveCooldownReductionPercent(value, this.balance)
      : value;
  }

  listStates(): readonly AwakenedWeaponState[] {
    return [...this.states.values()];
  }

  addAttunement(itemInstanceId: ItemInstanceId, amount: number): AwakenedResult<AwakenedAttunementGain> {
    const state = this.states.get(itemInstanceId);
    if (state === undefined) return fail("weapon_not_registered");
    if (!Number.isSafeInteger(amount) || amount <= 0) return fail("invalid_amount");

    const cap = deriveAwakenedWeaponState(state, this.balance).attunementCap;
    const available = Math.max(0, cap - state.storedAttunement);
    const stored = Math.min(available, amount);
    const next: AwakenedWeaponState = {
      ...state,
      storedAttunement: state.storedAttunement + stored,
    };
    this.states.set(itemInstanceId, next);
    return ok({
      requested: amount,
      stored,
      discardedAtCap: amount - stored,
      balance: next.storedAttunement,
      cap,
    });
  }

  awaken(itemInstanceId: ItemInstanceId): AwakenedResult<AwakenedWeaponState> {
    const state = this.states.get(itemInstanceId);
    if (state === undefined) return fail("weapon_not_registered");
    if (state.awakened) return fail("weapon_already_awakened");
    const derived = deriveAwakenedWeaponState(state, this.balance);
    if (!derived.canAwaken) return fail("awakening_threshold_not_reached");
    const cost = derived.awakeningAttunementThreshold;
    const next: AwakenedWeaponState = {
      ...state,
      awakened: true,
      storedAttunement: state.storedAttunement - cost,
      lifetimeAttunementInvested: state.lifetimeAttunementInvested + cost,
    };
    this.states.set(itemInstanceId, next);
    return ok(next);
  }

  improveTrait(
    itemInstanceId: ItemInstanceId,
    traitIndex: number,
    walletId: WalletId,
    roll01: () => number,
  ): AwakenedResult<AwakenedModificationOutcome> {
    const state = this.states.get(itemInstanceId);
    if (state === undefined) return fail("weapon_not_registered");
    if (!state.awakened) return fail("weapon_not_awakened");
    if (state.pendingTraitOffer !== undefined) return fail("trait_offer_pending");
    const existing = state.traits[traitIndex];
    if (existing === undefined) return fail("invalid_trait_index");

    const spent = this.spendAction(state, walletId);
    if (!spent.ok) return spent;
    const roll = rollAwakenedTrait(existing.traitId, roll01, this.balance);
    const traits = state.traits.map((trait, index) => index === traitIndex
      ? { ...trait, value: trait.value + roll.finalGain }
      : trait);
    const next = this.afterPaidModification(state, spent.value.attunement, { traits });
    const outcome: AwakenedModificationOutcome = { state: next, roll, cost: spent.value };
    this.states.set(itemInstanceId, next);
    this.lastImprovementOutcomes.set(itemInstanceId, outcome);
    return ok(outcome);
  }

  beginTraitOffer(
    itemInstanceId: ItemInstanceId,
    targetIndex: number,
    walletId: WalletId,
    roll01: () => number,
  ): AwakenedResult<AwakenedTraitOffer> {
    const state = this.states.get(itemInstanceId);
    if (state === undefined) return fail("weapon_not_registered");
    if (!state.awakened) return fail("weapon_not_awakened");
    if (state.pendingTraitOffer !== undefined) return fail("trait_offer_pending");

    const derived = deriveAwakenedWeaponState(state, this.balance);
    const isFill = targetIndex === state.traits.length;
    const isReroll = targetIndex >= 0 && targetIndex < state.traits.length;
    if (!isFill && !isReroll) return fail("invalid_trait_index");
    if (isFill && targetIndex >= derived.unlockedTraitSlots) return fail("trait_slot_locked");

    const spent = this.spendAction(state, walletId);
    if (!spent.ok) return spent;

    const targetTrait = isReroll ? state.traits[targetIndex]?.traitId : undefined;
    const eligible = getEligibleAwakenedTraits(
      state.traits.map((trait) => trait.traitId),
      targetTrait,
      this.balance,
    );
    const selected = this.pickDistinctTraits(eligible, this.balance.traitProposalCount, roll01);
    const proposals = selected.map((traitId) => rollAwakenedTrait(
      traitId,
      roll01,
      this.balance,
      false,
    ));
    const offer: AwakenedTraitOffer = {
      kind: isFill ? "fill" : "reroll",
      targetIndex,
      proposals,
    };
    const next = this.afterPaidModification(state, spent.value.attunement, { pendingTraitOffer: offer });
    this.states.set(itemInstanceId, next);
    return ok(offer);
  }

  resolveTraitOffer(
    itemInstanceId: ItemInstanceId,
    selectedTraitId?: AwakenedTraitId,
  ): AwakenedResult<AwakenedWeaponState> {
    const state = this.states.get(itemInstanceId);
    if (state === undefined) return fail("weapon_not_registered");
    if (!state.awakened) return fail("weapon_not_awakened");
    const offer = state.pendingTraitOffer;
    if (offer === undefined) return fail("no_trait_offer_pending");
    if (selectedTraitId === undefined) {
      if (offer.kind === "fill") return fail("choice_required");
      const { pendingTraitOffer: _pendingTraitOffer, ...rest } = state;
      const next: AwakenedWeaponState = rest;
      this.states.set(itemInstanceId, next);
      return ok(next);
    }

    const selected = offer.proposals.find((proposal) => proposal.traitId === selectedTraitId);
    if (selected === undefined) return fail("invalid_trait_choice");

    // Trait selection/reroll never benefits from Critical Attunement. Even a
    // legacy persisted offer carrying critical metadata resolves at baseRoll.
    const replacement = { traitId: selected.traitId, value: selected.baseRoll };
    const traits = [...state.traits];
    if (offer.kind === "fill") {
      if (offer.targetIndex !== traits.length) return fail("invalid_trait_index");
      traits.push(replacement);
    } else {
      if (traits[offer.targetIndex] === undefined) return fail("invalid_trait_index");
      traits[offer.targetIndex] = replacement;
    }
    const { pendingTraitOffer: _pendingTraitOffer, ...rest } = state;
    const next: AwakenedWeaponState = { ...rest, traits };
    this.states.set(itemInstanceId, next);
    return ok(next);
  }

  reset(itemInstanceId: ItemInstanceId): AwakenedResult<AwakenedWeaponState> {
    const state = this.states.get(itemInstanceId);
    if (state === undefined) return fail("weapon_not_registered");
    const next = resetAwakenedWeaponState(state);
    this.states.set(itemInstanceId, next);
    this.lastImprovementOutcomes.delete(itemInstanceId);
    return ok(next);
  }

  _restore(states: readonly AwakenedWeaponState[]): void {
    this.states.clear();
    this.lastImprovementOutcomes.clear();
    for (const state of states) this.states.set(state.itemInstanceId, state);
  }

  _snapshot(): readonly AwakenedWeaponState[] {
    return [...this.states.values()].sort((a, b) => String(a.itemInstanceId).localeCompare(String(b.itemInstanceId)));
  }

  private spendAction(state: AwakenedWeaponState, walletId: WalletId): AwakenedResult<AwakenedActionCost> {
    if (!state.awakened) return fail("weapon_not_awakened");
    const cost = deriveAwakenedWeaponState(state, this.balance).actionCost;
    if (state.storedAttunement < cost.attunement) return fail("insufficient_attunement");
    const canSpend = this.currencyService.canSpend(walletId, this.options.silverCurrencyId, cost.silver);
    if (!canSpend.ok) return fail("insufficient_silver");
    const debited = this.currencyService.debit(
      walletId,
      this.options.silverCurrencyId,
      cost.silver,
      this.options.silverSpendSource,
    );
    if (!debited.ok) return fail("insufficient_silver");
    return ok(cost);
  }

  private afterPaidModification(
    state: AwakenedWeaponState,
    attunementSpent: number,
    patch: Partial<Pick<AwakenedWeaponState, "traits" | "pendingTraitOffer">>,
  ): AwakenedWeaponState {
    return {
      ...state,
      ...patch,
      storedAttunement: state.storedAttunement - attunementSpent,
      lifetimeAttunementInvested: state.lifetimeAttunementInvested + attunementSpent,
      strain: state.strain + this.balance.strainPerModification,
    };
  }

  private pickDistinctTraits(
    eligible: readonly AwakenedTraitId[],
    count: number,
    roll01: () => number,
  ): readonly AwakenedTraitId[] {
    const pool = [...eligible];
    const wanted = Math.min(Math.max(0, Math.floor(count)), pool.length);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const r = Math.min(0.999999999, Math.max(0, roll01()));
      const j = Math.floor(r * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, wanted);
  }
}
