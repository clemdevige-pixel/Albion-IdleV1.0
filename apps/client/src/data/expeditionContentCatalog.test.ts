import { describe, expect, it } from "vitest";
import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";
import {
  FACTION_EXPEDITION_DEFINITIONS,
  SILVER_EXPEDITION_DEFINITIONS,
  getFactionExpeditionBaseRuneReward,
  getFactionExpeditionRuneReward,
  getSilverExpeditionReward,
} from "./expeditionContentCatalog.js";

const HOUR_MS = 60 * 60 * 1000;
const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;
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

  it("authors every faction across T4-T8 with only the matching Archaeology tier gate", () => {
    expect(FACTION_EXPEDITION_DEFINITIONS).toHaveLength(FACTIONS.length * TIERS.length);
    for (const factionId of FACTIONS) {
      const definitions = FACTION_EXPEDITION_DEFINITIONS.filter((entry) => entry.factionId === factionId);
      expect(definitions.map(({ tier }) => tier)).toEqual(TIERS);
      expect(new Set(definitions.map(({ typeId }) => typeId))).toEqual(new Set([factionId]));
      for (const definition of definitions) {
        expect(definition.requirements).toEqual([
          { type: "research_unlock", unlockId: FACTION_UNLOCKS[definition.tier as keyof typeof FACTION_UNLOCKS] },
        ]);
        expect(definition.reward).toEqual({
          kind: "faction_rune",
          itemId: `item_resource_rune_${factionId}_t${String(definition.tier)}`,
          runesPerHour: 1,
        });
      }
    }
  });

  it("applies the same whole-Rune rounding for every faction", () => {
    for (const factionId of FACTIONS) {
      const expeditionId = `expedition_${factionId}_t4`;
      expect(getFactionExpeditionBaseRuneReward(expeditionId, 6 * HOUR_MS)).toBe(6);
      expect(getFactionExpeditionRuneReward(expeditionId, 6 * HOUR_MS, 25)).toBe(8);
    }
  });
});
