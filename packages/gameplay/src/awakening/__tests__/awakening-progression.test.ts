import { describe, expect, it } from "vitest";
import { CurrencyRegistry } from "../../currency/currency-registry.js";
import { CurrencyService } from "../../currency/currency-service.js";
import { asPlayerId, asWalletId } from "../../currency/types.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { AwakeningSaveProvider } from "../awakening-save-provider.js";
import { AwakenedWeaponService } from "../awakening-service.js";
import { DEFAULT_AWAKENED_WEAPON_BALANCE } from "../balance.js";
import {
  getAwakenedActionCost,
  getAwakenedAttunementCap,
  getAwakenedTraitRollRange,
  getEffectiveCooldownReductionPercent,
  getEffectiveLifeStealPercent,
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
  it("uses compounded Attunement growth so every successive Awake costs more", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    const t8 = createFreshAwakenedWeaponState("weapon_t8" as ItemInstanceId, 8);

    expect(getAwakenedActionCost(t8, balance).attunement).toBe(5_000);
    expect(getAwakenedActionCost({ ...t8, strain: 10 }, balance).attunement).toBe(6_720);
    expect(getAwakenedActionCost({ ...t8, strain: 30 }, balance).attunement).toBe(12_136);
    expect(getAwakenedActionCost({ ...t8, strain: 50 }, balance).attunement).toBe(21_920);
    expect(getAwakenedActionCost({ ...t8, strain: 75 }, balance).attunement).toBe(45_895);
    expect(getAwakenedActionCost({ ...t8, strain: 100 }, balance).attunement).toBe(96_093);

    for (let strain = 0; strain < 100; strain += 1) {
      const current = getAwakenedActionCost({ ...t8, strain }, balance).attunement;
      const next = getAwakenedActionCost({ ...t8, strain: strain + 1 }, balance).attunement;
      expect(next).toBeGreaterThan(current);
    }
  });

  it("uses tier-linear base Silver costs and compounded Silver growth", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;

    expect(balance.tiers[4].baseSilverCost).toBe(12_000);
    expect(balance.tiers[5].baseSilverCost).toBe(24_000);
    expect(balance.tiers[6].baseSilverCost).toBe(36_000);
    expect(balance.tiers[7].baseSilverCost).toBe(48_000);
    expect(balance.tiers[8].baseSilverCost).toBe(60_000);

    const t8 = createFreshAwakenedWeaponState("weapon_t8_silver" as ItemInstanceId, 8);
    expect(getAwakenedActionCost(t8, balance).silver).toBe(60_000);
    expect(getAwakenedActionCost({ ...t8, strain: 10 }, balance).silver).toBe(77_558);
    expect(getAwakenedActionCost({ ...t8, strain: 30 }, balance).silver).toBe(129_590);
    expect(getAwakenedActionCost({ ...t8, strain: 50 }, balance).silver).toBe(216_531);
    expect(getAwakenedActionCost({ ...t8, strain: 75 }, balance).silver).toBe(411_342);
    expect(getAwakenedActionCost({ ...t8, strain: 100 }, balance).silver).toBe(781_425);

    for (let strain = 0; strain < 100; strain += 1) {
      const current = getAwakenedActionCost({ ...t8, strain }, balance).silver;
      const next = getAwakenedActionCost({ ...t8, strain: strain + 1 }, balance).silver;
      expect(next).toBeGreaterThan(current);
    }
  });

  it("grows Attunement storage by 2.5% of initial capacity per Strain", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    const t8 = createFreshAwakenedWeaponState("weapon_t8_cap" as ItemInstanceId, 8);

    expect(getAwakenedAttunementCap(t8, balance)).toBe(40_000);
    expect(getAwakenedAttunementCap({ ...t8, strain: 1 }, balance)).toBe(41_000);
    expect(getAwakenedAttunementCap({ ...t8, strain: 10 }, balance)).toBe(50_000);
    expect(getAwakenedAttunementCap({ ...t8, strain: 30 }, balance)).toBe(70_000);
  });

  it("unlocks trait slots at Strain 0, 10 and 25", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;
    expect(getUnlockedAwakenedTraitSlots({ strain: 0 }, balance)).toBe(1);
    expect(getUnlockedAwakenedTraitSlots({ strain: 9 }, balance)).toBe(1);
    expect(getUnlockedAwakenedTraitSlots({ strain: 10 }, balance)).toBe(2);
    expect(getUnlockedAwakenedTraitSlots({ strain: 24 }, balance)).toBe(2);
    expect(getUnlockedAwakenedTraitSlots({ strain: 25 }, balance)).toBe(3);
  });

  it("consumes tier Attunement when the initial Awakening is confirmed", () => {
    const { service } = createAwakeningFixture();
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

  it("authors direct CDR and Life Steal roll bands with 30% and 8% caps", () => {
    const balance = DEFAULT_AWAKENED_WEAPON_BALANCE;

    expect(balance.traitCaps).toEqual({ cooldown_reduction: 30, life_steal: 8 });
    expect(getAwakenedTraitRollRange("cooldown_reduction", 0, balance)).toEqual({ below: 8, min: 0.3, max: 0.6 });
    expect(getAwakenedTraitRollRange("cooldown_reduction", 8, balance)).toEqual({ below: 15, min: 0.18, max: 0.4 });
    expect(getAwakenedTraitRollRange("cooldown_reduction", 15, balance)).toEqual({ below: 22, min: 0.08, max: 0.22 });
    expect(getAwakenedTraitRollRange("cooldown_reduction", 22, balance)).toEqual({ below: 27, min: 0.03, max: 0.1 });
    expect(getAwakenedTraitRollRange("cooldown_reduction", 27, balance)).toEqual({ below: null, min: 0.01, max: 0.04 });

    expect(getAwakenedTraitRollRange("life_steal", 0, balance)).toEqual({ below: 2, min: 0.05, max: 0.12 });
    expect(getAwakenedTraitRollRange("life_steal", 2, balance)).toEqual({ below: 4, min: 0.03, max: 0.07 });
    expect(getAwakenedTraitRollRange("life_steal", 4, balance)).toEqual({ below: 6, min: 0.015, max: 0.04 });
    expect(getAwakenedTraitRollRange("life_steal", 6, balance)).toEqual({ below: null, min: 0.005, max: 0.02 });

    expect(getEffectiveCooldownReductionPercent(17.4, balance)).toBe(17.4);
    expect(getEffectiveCooldownReductionPercent(99, balance)).toBe(30);
    expect(getEffectiveLifeStealPercent(3.6, balance)).toBe(3.6);
    expect(getEffectiveLifeStealPercent(99, balance)).toBe(8);
  });

  it("caps a critical direct roll at the authored trait maximum", () => {
    const { walletId, service } = createAwakeningFixture();
    const instanceId = "weapon_cdr_cap" as ItemInstanceId;
    service._restore([{
      itemInstanceId: instanceId,
      tier: 4,
      awakened: true,
      storedAttunement: 15_000,
      lifetimeAttunementInvested: 10_000,
      strain: 1,
      traits: [{ traitId: "cooldown_reduction", value: 29.99 }],
    }]);

    const improved = service.improveTrait(instanceId, 0, walletId, () => 0);
    expect(improved.ok).toBe(true);
    if (!improved.ok) return;
    expect(improved.value.roll.critical).toBe(true);
    expect(improved.value.roll.finalGain).toBeCloseTo(0.01, 8);
    expect(improved.value.state.traits[0]?.value).toBeCloseTo(30, 8);
    expect(service.improveTrait(instanceId, 0, walletId, () => 0)).toEqual({ ok: false, reason: "trait_at_cap" });
  });

  it("never applies Critical Attunement while choosing or rerolling a trait", () => {
    const { walletId, service } = createAwakeningFixture();
    const instanceId = "weapon_t4_offer" as ItemInstanceId;

    expect(service.registerFresh(instanceId, 4).ok).toBe(true);
    expect(service.addAttunement(instanceId, 15_000).ok).toBe(true);
    expect(service.awaken(instanceId).ok).toBe(true);

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

  it("migrates V1 awakened values and writes the direct-stat V3 format", () => {
    const { service } = createAwakeningFixture();
    const provider = new AwakeningSaveProvider(service);
    provider.load({
      weapons: [
        {
          itemInstanceId: "legacy_a",
          tier: 8,
          awakened: true,
          storedAttunement: 12_345,
          lifetimeAttunementInvested: 250_000,
          strain: 50,
          traits: [
            { traitId: "item_power", value: 20 },
            { traitId: "ability_power", value: 3 },
            { traitId: "max_health", value: 45 },
          ],
          pendingTraitOffer: {
            kind: "reroll",
            targetIndex: 1,
            proposals: [
              { traitId: "ability_power", baseRoll: 0.4, critical: false, finalGain: 0.4 },
              { traitId: "item_power", baseRoll: 3, critical: false, finalGain: 3 },
            ],
          },
        },
        {
          itemInstanceId: "legacy_b",
          tier: 6,
          awakened: true,
          storedAttunement: 3_000,
          lifetimeAttunementInvested: 90_000,
          strain: 25,
          traits: [
            { traitId: "defense", value: 7.5 },
            { traitId: "life_steal", value: 3 },
            { traitId: "fame_bonus", value: 7.5 },
          ],
        },
      ],
    });

    const first = service.getState("legacy_a" as ItemInstanceId);
    expect(first?.strain).toBe(50);
    expect(first?.storedAttunement).toBe(12_345);
    expect(first?.lifetimeAttunementInvested).toBe(250_000);
    expect(first?.traits).toEqual([
      { traitId: "item_power", value: 15 },
      { traitId: "ability_power", value: 4.5 },
      { traitId: "max_health", value: 7.5 },
    ]);
    expect(first?.pendingTraitOffer?.proposals).toEqual([
      { traitId: "ability_power", baseRoll: 0.6, critical: false, finalGain: 0.6 },
      { traitId: "item_power", baseRoll: 2, critical: false, finalGain: 2 },
    ]);

    const second = service.getState("legacy_b" as ItemInstanceId);
    expect(second?.strain).toBe(25);
    expect(second?.traits[0]?.value).toBeCloseTo(4.5, 8);
    expect(second?.traits[1]?.value).toBeCloseTo(1.043478, 6);
    expect(second?.traits[2]?.value).toBeCloseTo(11.25, 8);

    expect(provider.save()).toMatchObject({ version: 3 });
  });

  it("migrates V2 internal CDR and Life Steal values without changing their combat effect", () => {
    const { service } = createAwakeningFixture();
    const provider = new AwakeningSaveProvider(service);
    provider.load({
      version: 2,
      weapons: [{
        itemInstanceId: "legacy_v2",
        tier: 8,
        awakened: true,
        storedAttunement: 10_000,
        lifetimeAttunementInvested: 100_000,
        strain: 30,
        traits: [
          { traitId: "cooldown_reduction", value: 10 },
          { traitId: "life_steal", value: 5 },
          { traitId: "ability_power", value: 6 },
        ],
      }],
    });

    const migrated = service.getState("legacy_v2" as ItemInstanceId);
    expect(migrated?.traits[0]?.value).toBeCloseTo(8.333333, 6);
    expect(migrated?.traits[1]?.value).toBeCloseTo(2.666667, 6);
    expect(migrated?.traits[2]?.value).toBe(6);
    expect(service.getDisplayTraitValue("cooldown_reduction", migrated?.traits[0]?.value ?? 0)).toBeCloseTo(8.333333, 6);
    expect(service.getDisplayTraitValue("life_steal", migrated?.traits[1]?.value ?? 0)).toBeCloseTo(2.666667, 6);
  });
});
