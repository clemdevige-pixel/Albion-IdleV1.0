import { describe, expect, it } from "vitest";
import {
  DAILY_MERCHANT_ALL_CANDIDATES,
  DAILY_MERCHANT_CANDIDATE_ITEM_IDS,
  DAILY_MERCHANT_CATEGORIES,
  DAILY_MERCHANT_QUANTITIES,
  DAILY_MERCHANT_ROTATION_RULES,
  DAILY_MERCHANT_TIERS,
  DAILY_MERCHANT_UNIT_PRICES,
  DAILY_MERCHANT_VENDOR_OFFERS,
  getDailyMerchantCandidatesForTier,
} from "../index.js";

describe("daily merchant authored balance", () => {
  it("keeps candidate item ids unique across authored candidates", () => {
    expect(DAILY_MERCHANT_CANDIDATE_ITEM_IDS.size).toBe(DAILY_MERCHANT_ALL_CANDIDATES.length);
    expect(DAILY_MERCHANT_VENDOR_OFFERS).toHaveLength(DAILY_MERCHANT_ALL_CANDIDATES.length);
  });

  it("authors every declared category for every declared tier", () => {
    for (const tier of DAILY_MERCHANT_TIERS) {
      const candidates = getDailyMerchantCandidatesForTier(tier);
      for (const category of DAILY_MERCHANT_CATEGORIES) {
        expect(candidates.some((candidate) => candidate.category === category)).toBe(true);
      }
    }
  });

  it("keeps rotation constraints internally valid", () => {
    expect(DAILY_MERCHANT_ROTATION_RULES.offerCount).toBeGreaterThan(0);
    for (const group of DAILY_MERCHANT_ROTATION_RULES.guaranteedCategoryGroups) {
      expect(group.length).toBeGreaterThan(0);
      expect(group.every((category) => DAILY_MERCHANT_CATEGORIES.includes(category))).toBe(true);
    }
    for (const group of DAILY_MERCHANT_ROTATION_RULES.limitedCategoryGroups) {
      expect(group.maximumPerRotation).toBeGreaterThanOrEqual(0);
      expect(group.categories.every((category) => DAILY_MERCHANT_CATEGORIES.includes(category))).toBe(true);
    }
  });

  it("registers vendor transaction limits directly from authored pack quantities", () => {
    for (const candidate of DAILY_MERCHANT_ALL_CANDIDATES) {
      const offer = DAILY_MERCHANT_VENDOR_OFFERS.find((entry) => entry.itemId === candidate.itemId);
      expect(offer).toBeDefined();
      expect(offer?.buyPrice).toBe(DAILY_MERCHANT_UNIT_PRICES[candidate.category][candidate.tier]);
      expect(offer?.sellPrice).toBeNull();
      expect(offer?.maxPerTransaction).toBe(Math.max(...DAILY_MERCHANT_QUANTITIES[candidate.category]));
    }
  });
});
