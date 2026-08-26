import { describe, expect, it } from "vitest";
import {
  DAILY_MERCHANT_CATEGORY_WEIGHTS,
  DAILY_MERCHANT_OFFER_COUNT,
  DAILY_MERCHANT_QUANTITIES,
  DAILY_MERCHANT_UNIT_PRICES,
} from "@game/data";
import {
  DailyMerchantRotationSaveProvider,
  generateDailyMerchantOffers,
  getDailyMerchantRotationId,
} from "./DailyMerchantRotation.js";

const COMPLETE_CATEGORIES = new Set(["key", "artifact"]);
const RESOURCE_CATEGORIES = new Set(["raw_resource", "refined_resource"]);

describe("daily merchant rotation", () => {
  it("keeps the validated proposal-B authored weights and prices", () => {
    expect(Object.values(DAILY_MERCHANT_CATEGORY_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(DAILY_MERCHANT_CATEGORY_WEIGHTS).toEqual({
      raw_resource: 25,
      refined_resource: 25,
      enchantment_shard: 20,
      key_fragment: 12,
      artifact_fragment: 10,
      key: 6,
      artifact: 2,
    });
    expect(DAILY_MERCHANT_UNIT_PRICES.raw_resource).toEqual({ 4: 400, 5: 1_000, 6: 2_250, 7: 3_000, 8: 3_750 });
    expect(DAILY_MERCHANT_UNIT_PRICES.refined_resource).toEqual({ 4: 2_000, 5: 5_500, 6: 14_000, 7: 22_000, 8: 30_500 });
    expect(DAILY_MERCHANT_UNIT_PRICES.enchantment_shard).toEqual({ 4: 1_000, 5: 1_500, 6: 2_000, 7: 2_500, 8: 3_500 });
    expect(DAILY_MERCHANT_UNIT_PRICES.key).toEqual({ 4: 32_500, 5: 67_500, 6: 137_500, 7: 185_000, 8: 365_000 });
    expect(DAILY_MERCHANT_UNIT_PRICES.artifact).toEqual({ 4: 110_000, 5: 182_500, 6: 315_000, 7: 390_000, 8: 680_000 });
    expect(DAILY_MERCHANT_QUANTITIES.raw_resource).toEqual([10, 20]);
    expect(DAILY_MERCHANT_QUANTITIES.refined_resource).toEqual([5, 10]);
  });

  it("is deterministic and respects all daily guardrails", () => {
    const first = generateDailyMerchantOffers("2026-08-26", [4, 5, 6, 7, 8]);
    const second = generateDailyMerchantOffers("2026-08-26", [4, 5, 6, 7, 8]);

    expect(first).toEqual(second);
    expect(first).toHaveLength(DAILY_MERCHANT_OFFER_COUNT);
    expect(first.some((offer) => RESOURCE_CATEGORIES.has(offer.category))).toBe(true);
    expect(first.filter((offer) => COMPLETE_CATEGORIES.has(offer.category)).length).toBeLessThanOrEqual(1);
    expect(first.every((offer) => [4, 5, 6, 7, 8].includes(offer.tier))).toBe(true);
  });

  it("does not structurally force the first slot to be a resource", () => {
    const firstCategories = new Set(
      Array.from({ length: 80 }, (_, index) => generateDailyMerchantOffers(`weights-${String(index)}`, [4, 5, 6])[0]?.category),
    );
    expect([...firstCategories].some((category) => category !== undefined && !RESOURCE_CATEGORIES.has(category))).toBe(true);
  });

  it("never rolls a locked tier and treats every unlocked tier as eligible", () => {
    for (let day = 1; day <= 120; day += 1) {
      const offers = generateDailyMerchantOffers(`locked-tier-${String(day)}`, [4, 5, 6]);
      expect(offers.every((offer) => offer.tier === 4 || offer.tier === 5 || offer.tier === 6)).toBe(true);
    }

    const observed = new Set<number>();
    for (let day = 1; day <= 60; day += 1) {
      for (const offer of generateDailyMerchantOffers(`fairness-${String(day)}`, [4, 5, 6])) observed.add(offer.tier);
    }
    expect(observed).toEqual(new Set([4, 5, 6]));
  });

  it("keeps the current day's stock stable when an additional tier unlocks", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const now = Date.UTC(2026, 7, 26, 12, 0, 0);
    const beforeUnlock = provider.getOffers(now, [4, 5]);
    const afterUnlock = provider.getOffers(now, [4, 5, 6]);

    expect(afterUnlock).toEqual(beforeUnlock);
    expect(afterUnlock.every((offer) => offer.tier === 4 || offer.tier === 5)).toBe(true);
  });

  it("creates the day's stock when the first eligible tier unlocks", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const now = Date.UTC(2026, 7, 26, 12, 0, 0);
    expect(provider.getOffers(now, [])).toEqual([]);
    const unlocked = provider.getOffers(now, [4]);
    expect(unlocked).toHaveLength(DAILY_MERCHANT_OFFER_COUNT);
    expect(unlocked.every((offer) => offer.tier === 4)).toBe(true);
  });

  it("rotates on the next UTC day and persists purchased offers", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const dayOne = Date.UTC(2026, 7, 26, 12, 0, 0);
    const dayTwo = Date.UTC(2026, 7, 27, 12, 0, 0);
    const dayOneOffers = provider.getOffers(dayOne, [4, 5]);
    const firstOffer = dayOneOffers[0]!;

    expect(provider.markPurchased(firstOffer.offerId)).toBe(true);
    const saved = provider.save();

    const restored = new DailyMerchantRotationSaveProvider();
    restored.load(saved);
    expect(restored.getOffers(dayOne, [4, 5])[0]?.purchased).toBe(true);

    const dayTwoOffers = restored.getOffers(dayTwo, [4, 5, 6]);
    expect(dayTwoOffers).toHaveLength(DAILY_MERCHANT_OFFER_COUNT);
    expect(dayTwoOffers.every((offer) => !offer.purchased)).toBe(true);
    expect(getDailyMerchantRotationId(dayOne)).not.toBe(getDailyMerchantRotationId(dayTwo));
  });

  it("rejects an offer after its daily rotation has expired", () => {
    const provider = new DailyMerchantRotationSaveProvider();
    const dayOne = Date.UTC(2026, 7, 26, 23, 59, 0);
    const dayTwo = Date.UTC(2026, 7, 27, 0, 1, 0);
    const expiredOffer = provider.getOffers(dayOne, [4, 5])[0]!;

    expect(provider.canPurchase(expiredOffer.offerId, dayOne, [4, 5])).toBe(true);
    expect(provider.canPurchase(expiredOffer.offerId, dayTwo, [4, 5])).toBe(false);
  });
});
