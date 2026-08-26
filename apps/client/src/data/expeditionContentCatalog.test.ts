import { getFactionRuneItemId } from "@game/data";
import { describe, expect, it } from "vitest";
import { FACTION_EXPEDITION_REWARD_PROFILES } from "./factionExpeditionRewardContentCatalog.js";
import { GENERALIST_EXPEDITION_REWARD_PROFILES } from "./generalistExpeditionRewardContentCatalog.js";
import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";
import {
  FACTION_EXPEDITION_DEFINITIONS,
  FACTION_EXPEDITION_TYPE_ID,
  SILVER_EXPEDITION_DEFINITIONS,
} from "./expeditionContentCatalog.js";

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
  it("authors the validated Generalist Silver/shard curve while preserving compatibility IDs", () => {
    expect(SILVER_EXPEDITION_DEFINITIONS.map(({ tier, displayName, reward }) => [
      tier,
      displayName,
      reward.silverPerHour,
      reward.shardsPerHour,
    ])).toEqual([
      [4, "Expédition généraliste T4", 30_000, 23],
      [5, "Expédition généraliste T5", 55_000, 23.5],
      [6, "Expédition généraliste T6", 70_000, 25],
      [7, "Expédition généraliste T7", 80_000, 21.5],
      [8, "Expédition généraliste T8", 90_000, 19],
    ]);

    for (const definition of SILVER_EXPEDITION_DEFINITIONS) {
      expect(definition.typeId).toBe("silver");
      expect(definition.id).toBe(`expedition_silver_t${String(definition.tier)}`);
    }
  });

  it("gates each Generalist tier through the existing Cartography unlock", () => {
    for (const definition of SILVER_EXPEDITION_DEFINITIONS) {
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: SILVER_UNLOCKS[definition.tier as keyof typeof SILVER_UNLOCKS] },
      ]);
      const tier = definition.tier as 4 | 5 | 6 | 7 | 8;
      expect(definition.reward.silverPerHour).toBe(GENERALIST_EXPEDITION_REWARD_PROFILES[tier].silverPerHour);
      expect(definition.reward.shardsPerHour).toBe(GENERALIST_EXPEDITION_REWARD_PROFILES[tier].shardsPerHour);
    }
  });

  it("authors one common Faction expedition per tier behind Archaeology", () => {
    expect(FACTION_EXPEDITION_DEFINITIONS).toHaveLength(TIERS.length);
    expect(FACTION_EXPEDITION_DEFINITIONS.map(({ tier }) => tier)).toEqual(TIERS);
    expect(new Set(FACTION_EXPEDITION_DEFINITIONS.map(({ typeId }) => typeId)))
      .toEqual(new Set([FACTION_EXPEDITION_TYPE_ID]));

    for (const definition of FACTION_EXPEDITION_DEFINITIONS) {
      const tier = definition.tier as 4 | 5 | 6 | 7 | 8;
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: FACTION_UNLOCKS[tier] },
      ]);
      expect(definition.reward).toEqual({
        kind: "faction_rune",
        itemId: getFactionRuneItemId(tier),
        runesPerHour: FACTION_EXPEDITION_REWARD_PROFILES[tier].runesPerHour,
      });
    }
  });

  it("uses the validated Faction Rune/hour baseline from the reward profile", () => {
    expect(FACTION_EXPEDITION_DEFINITIONS.map(({ tier, reward }) => [tier, reward.runesPerHour]))
      .toEqual([[4, 8], [5, 10], [6, 12], [7, 15], [8, 18]]);
  });
});
