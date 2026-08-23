import { describe, expect, it } from "vitest";
import { getFactionRuneItemId } from "./factionRuneContentCatalog.js";
import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";
import {
  FACTION_EXPEDITION_DEFINITIONS,
  FACTION_EXPEDITION_TYPE_ID,
  SILVER_EXPEDITION_DEFINITIONS,
  getFactionExpeditionBaseRuneReward,
  getSilverExpeditionReward,
} from "./expeditionContentCatalog.js";

const HOUR_MS = 60 * 60 * 1000;
const TIERS = [4, 5, 6, 7, 8] as const;
const SILVER_UNLOCKS = {
  4: RESEARCH_UNLOCK_IDS.silverExpeditionTier4,
  5: RESEARCH_UNLOCK_IDS.silverExpeditionTier5,
  6: RESEARCH_UNLOCK_IDS.silverExpeditionTier6,
  7: RESEARCH_UNLOCK_IDS.silverExpeditionTier7,
  8: RESEARCH_UNLOCK_IDS.silverExpeditionTier8,
} as const;
const FACTION_UNLOCKS = {
  4: RESEARCH_UNLOCK_IDS.factionExpeditionTier4,
  5: RESEARCH_UNLOCK_IDS.factionExpeditionTier5,
  6: RESEARCH_UNLOCK_IDS.factionExpeditionTier6,
  7: RESEARCH_UNLOCK_IDS.factionExpeditionTier7,
  8: RESEARCH_UNLOCK_IDS.factionExpeditionTier8,
} as const;

describe("expeditionContentCatalog", () => {
  it("authors the validated T4-T8 Silver/hour curve", () => {
    expect(SILVER_EXPEDITION_DEFINITIONS.map(({ tier, reward }) => [tier, reward.silverPerHour]))
      .toEqual([[4, 15_000], [5, 25_000], [6, 35_000], [7, 40_000], [8, 50_000]]);
  });

  it("gates each Silver tier through the matching Cartography unlock", () => {
    for (const definition of SILVER_EXPEDITION_DEFINITIONS) {
      expect(definition.typeId).toBe("silver");
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: SILVER_UNLOCKS[definition.tier as keyof typeof SILVER_UNLOCKS] },
      ]);
    }
  });

  it("keeps Silver reward/hour identical across duration choices", () => {
    expect(getSilverExpeditionReward("expedition_silver_t4", 2 * HOUR_MS)).toBe(30_000);
    expect(getSilverExpeditionReward("expedition_silver_t4", 6 * HOUR_MS)).toBe(90_000);
    expect(getSilverExpeditionReward("expedition_silver_t8", 12 * HOUR_MS)).toBe(600_000);
  });

  it("authors one common Faction expedition per tier behind Archaeology", () => {
    expect(FACTION_EXPEDITION_DEFINITIONS).toHaveLength(TIERS.length);
    expect(FACTION_EXPEDITION_DEFINITIONS.map(({ tier }) => tier)).toEqual(TIERS);
    expect(new Set(FACTION_EXPEDITION_DEFINITIONS.map(({ typeId }) => typeId)))
      .toEqual(new Set([FACTION_EXPEDITION_TYPE_ID]));

    for (const definition of FACTION_EXPEDITION_DEFINITIONS) {
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: FACTION_UNLOCKS[definition.tier as keyof typeof FACTION_UNLOCKS] },
      ]);
      expect(definition.reward).toEqual({
        kind: "faction_rune",
        itemId: getFactionRuneItemId(definition.tier as 4 | 5 | 6 | 7 | 8),
        runesPerHour: 1,
      });
    }
  });

  it("keeps the existing guaranteed Rune/hour baseline until the reward-table balance pass", () => {
    expect(getFactionExpeditionBaseRuneReward("expedition_faction_t4", 2 * HOUR_MS)).toBe(2);
    expect(getFactionExpeditionBaseRuneReward("expedition_faction_t4", 6 * HOUR_MS)).toBe(6);
    expect(getFactionExpeditionBaseRuneReward("expedition_faction_t8", 12 * HOUR_MS)).toBe(12);
  });
});
