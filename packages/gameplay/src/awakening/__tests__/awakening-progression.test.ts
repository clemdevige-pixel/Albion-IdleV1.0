import { describe, expect, it } from "vitest";
import { CurrencyService } from "../../currency/currency-service.js";
import { asWalletId } from "../../currency/types.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { AwakenedWeaponService } from "../awakening-service.js";
import { DEFAULT_AWAKENED_WEAPON_BALANCE } from "../balance.js";
import { getAwakenedActionCost, getUnlockedAwakenedTraitSlots } from "../calculations.js";
import { createFreshAwakenedWeaponState } from "../state.js";

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
    const currency = new CurrencyService();
    const walletId = asWalletId("wallet_test");
    currency.createWallet(walletId);
    const service = new AwakenedWeaponService(currency, { silverCurrencyId: "currency_silver" });
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
});
