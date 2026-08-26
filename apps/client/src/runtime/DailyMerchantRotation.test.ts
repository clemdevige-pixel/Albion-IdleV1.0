import { describe, expect, it } from "vitest";
import {
  DAILY_MERCHANT_CATEGORY_WEIGHTS,
  DAILY_MERCHANT_QUANTITIES,
  DAILY_MERCHANT_ROTATION_RULES,
  DAILY_MERCHANT_TIERS,
  DAILY_MERCHANT_UNIT_PRICES,
} from "@game/data";
import {
  DailyMerchantRotationSaveProvider,
  generateDailyMerchantOffers,
  getDailyMerchantRotationId,
} from "./DailyMerchantRotation.js";

describe("daily merchant rotation", () => {
  it("consumes a complete authored balance contract", () => {
    expect(Object.values(DAILY_MERCHANT_CATEGORY_WEIGHTS).every((weight) => weight > 0)).toBe(true);
    expect(Object.values(DAILY_MERCHANT_QUANTITIES).every((quantities) => (
      quantities.length > 0 && quantities.every((quantity) => quantity > 0)
    ))).toBe(true);
    expect(Object.values(DAILY_MERCHANT_UNIT_PRICES).every((pricesByTier) => (
      DAILY_MERCHANT_TIERS.every((tier) => pricesByTier[tier] > 0)
    ))).toBe(true);
    expect(DAILY_MERCHANT_ROTATION_RULES.offerCount).toBeGreaterThan(0);
    expect(DAILY_MERCHANT_ROTATION_RULES.resetHourUtc).toBeGreaterThanOrEqual(0);
    expect(DAILY_MERCHANT_ROTATION_RULES.resetHourUtc).toBeLessThan(24);
  });

  it("is deterministic and respects authored guardrails", () => {
    const first = generateDailyMerchantOffers("2026-08-26", DAILY_MERCHANT_TIERS);
    const second = generateDailyMerchantOffers("2026-08-26", DAILY_MERCHANT_TIERS);

    expect(first).toEqual(second);
    expect(first).toHaveLength(DAILY_MERCHANT_ROTATION_RULES.offerCount);

    for (const group of DAILY_MERCHANT_ROTATION_RULES.guaranteedCategoryGroups) {
      expect(first.some((offer) => group.includes(offer.category))).toBe(true);
    }
    for (const group of DAILY_MERCHANT_ROTATION_RULES.limitedCategoryGroups) {
      expect(first.filter((offer) => group.categories.includes(offer.category)).length)
        .toBeLessThanOrEqual(group.maximumPerRotation);
    }
    expect(first.every((offer) => DAILY_MERCHANT_TIERS.includes(offer.tier))).toBe(true);
  });

  it("does not structurally force the first slot to a guaranteed category group", () => {
    const guaranteedCategories = new Set(
      DAILY_MERCHANT_ROTATION_RULES.guaranteedCategoryGroups.flat(),
    );
    const firstCategories = new Set(
      Array.from(
        { length: 80 },
        (_, index) => generateDailyMerchantOffers(`weights-${String(index)}`, DAILY_MERCHANT_TIERS)[0]?.category,
      ),
    );
    expect([...firstCategories].some((category) => (
      category !== undefined && !guaranteedCategories.has(category)
    ))).toBe(true);
  });

  it("never rolls a locked tier and treats every unlocked tier as eligible", () => {
    const unlockedTiers = DAILY_MERCHANT_TIERS.slice(0, 3);
    for (let day = 1; day <= 120; day += 1) {
      const offers = generateDailyMerchantOffers(`locked-tier-${String(day)}`, unlockedTiers);
      expect(offers.every((offer) => unlockedTiers.includes(offer.tier))).toBe(true);
    }

    const observed = new Set<number>();
    for (let day = 1; day <= 60; day += 1) {
      for (const offer of generateDailyMerchantOffers(`fairness-${String(day)}`, unlockedTiers)) {
        observed.add(offer.tier);
      }
    }
    expect(observed).toEqual(new Set(unlockedTiers));
  });

  it("keeps the current day's stock stable when an additional tier unlocks", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const now = Date.UTC(2026, 7, 26, 12, 0, 0);
    const initialTiers = DAILY_MERCHANT_TIERS.slice(0, 2);
    const expandedTiers = DAILY_MERCHANT_TIERS.slice(0, 3);
    const beforeUnlock = provider.getOffers(now, initialTiers);
    const afterUnlock = provider.getOffers(now, expandedTiers);

    expect(afterUnlock).toEqual(beforeUnlock);
    expect(afterUnlock.every((offer) => initialTiers.includes(offer.tier))).toBe(true);
  });

  it("creates the day's stock when the first eligible tier unlocks", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const now = Date.UTC(2026, 7, 26, 12, 0, 0);
    const firstTier = DAILY_MERCHANT_TIERS[0];
    expect(provider.getOffers(now, [])).toEqual([]);
    const unlocked = provider.getOffers(now, [firstTier]);
    expect(unlocked).toHaveLength(DAILY_MERCHANT_ROTATION_RULES.offerCount);
    expect(unlocked.every((offer) => offer.tier === firstTier)).toBe(true);
  });

  it("rotates on the next authored reset window and persists purchased offers", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const dayOne = Date.UTC(2026, 7, 26, 12, 0, 0);
    const dayTwo = Date.UTC(2026, 7, 27, 12, 0, 0);
    const unlockedTiers = DAILY_MERCHANT_TIERS.slice(0, 2);
    const expandedTiers = DAILY_MERCHANT_TIERS.slice(0, 3);
    const dayOneOffers = provider.getOffers(dayOne, unlockedTiers);
    const firstOffer = dayOneOffers[0]!;

    expect(provider.markPurchased(firstOffer.offerId)).toBe(true);
    const saved = provider.save();

    const restored = new DailyMerchantRotationSaveProvider();
    restored.load(saved);
    expect(restored.getOffers(dayOne, unlockedTiers)[0]?.purchased).toBe(true);

    const dayTwoOffers = restored.getOffers(dayTwo, expandedTiers);
    expect(dayTwoOffers).toHaveLength(DAILY_MERCHANT_ROTATION_RULES.offerCount);
    expect(dayTwoOffers.every((offer) => !offer.purchased)).toBe(true);
    expect(getDailyMerchantRotationId(dayOne)).not.toBe(getDailyMerchantRotationId(dayTwo));
  });

  it("rejects an offer after its rotation has expired", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const beforeReset = Date.UTC(2026, 7, 26, 23, 59, 0);
    const afterReset = Date.UTC(2026, 7, 27, 0, 1, 0);
    const unlockedTiers = DAILY_MERCHANT_TIERS.slice(0, 2);
    const expiredOffer = provider.getOffers(beforeReset, unlockedTiers)[0]!;

    expect(provider.canPurchase(expiredOffer.offerId, beforeReset, unlockedTiers)).toBe(true);
    expect(provider.canPurchase(expiredOffer.offerId, afterReset, unlockedTiers)).toBe(false);
  });
});
