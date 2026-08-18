import { describe, expect, it } from "vitest";
import { CurrencyRegistry } from "../../currency/currency-registry.js";
import { CurrencyService } from "../../currency/currency-service.js";
import { asPlayerId, asWalletId } from "../../currency/types.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { AwakenedWeaponService } from "../awakening-service.js";
import { DEFAULT_AWAKENED_WEAPON_BALANCE } from "../balance.js";
import {
  getAwakenedActionCost,
  getAwakenedAttunementCap,
  getUnlockedAwakenedTraitSlots,
} from "../calculations.js";
import { createFreshAwakenedWeaponState } from "../state.js";

function createAwakeningFixture() {
  const registry = new CurrencyRegistry();
  registry.register({ id: "currency_silver", enabled: true, minValue: 0, maxValue: null });
  const currency = new CurrencyService(registry);
  const walletId = asWalletId("wallet_test");
  currency.createWallet(walletId, asPlayerId("player_test"));
  currency.credit(walletId, "currency_silver", 1_000_000);
  const service = new AwakenedWeaponService(currency, { silverCurrencyId: "currency_silver" });
  return { currency, walletId, service };
}

describe("awakened weapon progression", () => {
  it("uses the validated low initial Attunement costs and quadratic Strain curve", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    const t8 = createFreshAwakenedWeaponState("weapon_t8" as ItemInstanceId, 8);

    expect(getAwakenedActionCost(t8, balance).attunement).toBe(5_000);
    expect(getAwakenedActionCost({ ...t8, strain: 10 }, balance).attunement).toBeCloseTo(6_500, -1);
    expect(getAwakenedActionCost({ ...t8, strain: 30 }, balance).attunement).toBeCloseTo(14_500, -1);
    expect(getAwakenedActionCost({ ...t8, strain: 100 }, balance).attunement).toBeCloseTo(95_000, -1);
  });

  it("uses tier-linear base Silver costs and the validated Silver Strain curve", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;

    expect(balance.tiers[4].baseSilverCost).toBe(12_000);
    expect(balance.tiers[5].baseSilverCost).toBe(24_000);
    expect(balance.tiers[6].baseSilverCost).toBe(36_000);
    expect(balance.tiers[7].baseSilverCost).toBe(48_000);
    expect(balance.tiers[8].baseSilverCost).toBe(60_000);

    const t8 = createFreshAwakenedWeaponState("weapon_t8_silver" as ItemInstanceId, 8);
    expect(getAwakenedActionCost(t8, balance).silver).toBe(60_000);
    expect(getAwakenedActionCost({ ...t8, strain: 10 }, balance).silver).toBe(78_000);
    expect(getAwakenedActionCost({ ...t8, strain: 30 }, balance).silver).toBe(150_000);
    expect(getAwakenedActionCost({ ...t8, strain: 50 }, balance).silver).toBe(270_000);
    expect(getAwakenedActionCost({ ...t8, strain: 75 }, balance).silver).toBe(487_500);
    expect(getAwakenedActionCost({ ...t8, strain: 100 }, balance).silver).toBe(780_000);
  });

  it("grows Attunement storage by 2.5% of initial capacity per Strain", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    const t8 = createFreshAwakenedWeaponState("weapon_t8_cap" as ItemInstanceId, 8);

    expect(getAwakenedAttunementCap(t8, balance)).toBe(40_000);
    expect(getAwakenedAttunementCap({ ...t8, strain: 1 }, balance)).toBe(41_000);
    expect(getAwakenedAttunementCap({ ...t8, strain: 10 }, balance)).toBe(50_000);
    expect(getAwakenedAttunementCap({ ...t8, strain: 30 }, balance)).toBe(70_000);
  });

  it("unlocks trait slots at Strain 0, 10 and 30", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    expect(getUnlockedAwakenedTraitSlots({ strain: 0 }, balance)).toBe(1);
    expect(getUnlockedAwakenedTraitSlots({ strain: 9 }, balance)).toBe(1);
    expect(getUnlockedAwakenedTraitSlots({ strain: 10 }, balance)).toBe(2);
    expect(getUnlockedAwakenedTraitSlots({ strain: 29 }, balance)).toBe(2);
    expect(getUnlockedAwakenedTraitSlots({ strain: 30 }, balance)).toBe(3);
  });

  it("consumes tier Attunement when the initial Awakening is confirmed", () => {
    const { walletId: _walletId, service } = createAwakeningFixture();
    const instanceId = "weapon_t4" as ItemInstanceId;

    expect(service.registerFresh(instanceId, 4).ok).toBe(true);
    expect(service.getState(instanceId)?.awakened).toBe(false);
    expect(service.awaken(instanceId)).toEqual({ ok: false, reason: "awakening_threshold_not_reached" });

    expect(service.addAttunement(instanceId, 5_000).ok).toBe(true);
    expect(service.getDerivedState(instanceId)?.canAwaken).toBe(true);
    expect(service.awaken(instanceId).ok).toBe(true);
    expect(service.getState(instanceId)?.awakened).toBe(true);
    expect(service.getState(instanceId)?.storedAttunement).toBe(0);
    expect(service.getState(instanceId)?.lifetimeAttunementInvested).toBe(5_000);
  });

  it("authors Fame Bonus as a 0.5% to 1% trait roll", () => {
    expect(DEFAULT_AWAKENED_WEAPON_BALANCE.traitRolls.fame_bonus).toEqual({ min: 0.5, max: 1 });
  });

  it("never applies Critical Attunement while choosing or rerolling a trait", () => {
    const { walletId, service } = createAwakeningFixture();
    const instanceId = "weapon_t4_offer" as ItemInstanceId;

    expect(service.registerFresh(instanceId, 4).ok).toBe(true);
    expect(service.addAttunement(instanceId, 15_000).ok).toBe(true);
    expect(service.awaken(instanceId).ok).toBe(true);

    // roll01=0 would always crit under the normal 15% rule.
    const offer = service.beginTraitOffer(instanceId, 0, walletId, () => 0);
    expect(offer.ok).toBe(true);
    if (!offer.ok) return;

    for (const proposal of offer.value.proposals) {
      expect(proposal.critical).toBe(false);
      expect(proposal.finalGain).toBe(proposal.baseRoll);
    }

    const chosen = offer.value.proposals[0];
    expect(chosen).toBeDefined();
    if (chosen === undefined) return;
    expect(service.resolveTraitOffer(instanceId, chosen.traitId).ok).toBe(true);
    expect(service.getState(instanceId)?.traits[0]?.value).toBe(chosen.baseRoll);
  });
});
