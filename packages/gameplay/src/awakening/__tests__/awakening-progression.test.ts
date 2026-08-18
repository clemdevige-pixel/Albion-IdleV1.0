import { describe, expect, it } from "vitest";
import { CurrencyRegistry } from "../../currency/currency-registry.js";
import { CurrencyService } from "../../currency/currency-service.js";
import { asPlayerId, asWalletId } from "../../currency/types.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { AwakenedWeaponService } from "../awakening-service.js";
import { DEFAULT_AWAKENED_WEAPON_BALANCE } from "../balance.js";
import { getAwakenedActionCost, getUnlockedAwakenedTraitSlots } from "../calculations.js";
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

  it("unlocks trait slots at Strain 0, 10 and 30", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    expect(getUnlockedAwakenedTraitSlots({ strain: 0 }, balance)).toBe(1);
    expect(getUnlockedAwakenedTraitSlots({ strain: 9 }, balance)).toBe(1);
    expect(getUnlockedAwakenedTraitSlots({ strain: 10 }, balance)).toBe(2);
    expect(getUnlockedAwakenedTraitSlots({ strain: 29 }, balance)).toBe(2);
    expect(getUnlockedAwakenedTraitSlots({ strain: 30 }, balance)).toBe(3);
  });

  it("requires tier Attunement before the initial Awakening and does not consume it", () => {
    const { walletId: _walletId, service } = createAwakeningFixture();
    const instanceId = "weapon_t4" as ItemInstanceId;

    expect(service.registerFresh(instanceId, 4).ok).toBe(true);
    expect(service.getState(instanceId)?.awakened).toBe(false);
    expect(service.awaken(instanceId)).toEqual({ ok: false, reason: "awakening_threshold_not_reached" });

    expect(service.addAttunement(instanceId, 5_000).ok).toBe(true);
    expect(service.getDerivedState(instanceId)?.canAwaken).toBe(true);
    expect(service.awaken(instanceId).ok).toBe(true);
    expect(service.getState(instanceId)?.awakened).toBe(true);
    expect(service.getState(instanceId)?.storedAttunement).toBe(5_000);
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
