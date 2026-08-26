import { describe, expect, it } from "vitest";
import {
  DAILY_MERCHANT_ALL_CANDIDATES,
  DAILY_MERCHANT_CANDIDATE_ITEM_IDS,
  DAILY_MERCHANT_QUANTITIES,
  DAILY_MERCHANT_TIERS,
  DAILY_MERCHANT_UNIT_PRICES,
  DAILY_MERCHANT_VENDOR_OFFERS,
  getDailyMerchantCandidatesForTier,
} from "../index.js";

describe("daily merchant authored balance", () => {
  it("keeps candidate item ids unique across every tier/category/faction", () => {
    expect(DAILY_MERCHANT_CANDIDATE_ITEM_IDS.size).toBe(DAILY_MERCHANT_ALL_CANDIDATES.length);
    expect(DAILY_MERCHANT_VENDOR_OFFERS).toHaveLength(DAILY_MERCHANT_ALL_CANDIDATES.length);
  });

  it("authors all supported candidate families for every tier", () => {
    for (const tier of DAILY_MERCHANT_TIERS) {
      const candidates = getDailyMerchantCandidatesForTier(tier);
      expect(candidates.filter((candidate) => candidate.category === "raw_resource")).toHaveLength(4);
      expect(candidates.filter((candidate) => candidate.category === "refined_resource")).toHaveLength(4);
      expect(candidates.filter((candidate) => candidate.category === "enchantment_shard")).toHaveLength(1);
      expect(candidates.filter((candidate) => candidate.category === "key_fragment")).toHaveLength(1);
      expect(candidates.filter((candidate) => candidate.category === "key")).toHaveLength(1);
      expect(candidates.filter((candidate) => candidate.category === "artifact_fragment")).toHaveLength(4);
      expect(candidates.filter((candidate) => candidate.category === "artifact")).toHaveLength(4);
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
