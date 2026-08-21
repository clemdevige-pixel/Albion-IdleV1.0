import { describe, expect, it } from "vitest";
import {
  KEEPER_EXPEDITION_DEFINITIONS,
  SILVER_EXPEDITION_DEFINITIONS,
  getFactionExpeditionBaseRuneReward,
  getSilverExpeditionReward,
} from "./expeditionContentCatalog.js";

const HOUR_MS = 60 * 60 * 1000;

describe("expeditionContentCatalog", () => {
  it("authors the validated T4-T8 Silver/hour curve", () => {
    expect(SILVER_EXPEDITION_DEFINITIONS.map(({ tier, reward }) => [tier, reward.silverPerHour]))
      .toEqual([
        [4, 15_000],
        [5, 25_000],
        [6, 35_000],
        [7, 40_000],
        [8, 50_000],
      ]);
  });

  it("keeps every Silver expedition on the same concurrency type", () => {
    expect(new Set(SILVER_EXPEDITION_DEFINITIONS.map(({ typeId }) => typeId)))
      .toEqual(new Set(["silver"]));
  });

  it("gates each Silver tier through Research unlock data", () => {
    for (const definition of SILVER_EXPEDITION_DEFINITIONS) {
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: `expedition_tier:${String(definition.tier)}` },
      ]);
    }
  });

  it("keeps Silver reward/hour identical across 2h, 6h and 12h choices", () => {
    expect(getSilverExpeditionReward("expedition_silver_t4", 2 * HOUR_MS)).toBe(30_000);
    expect(getSilverExpeditionReward("expedition_silver_t4", 6 * HOUR_MS)).toBe(90_000);
    expect(getSilverExpeditionReward("expedition_silver_t4", 12 * HOUR_MS)).toBe(180_000);

    expect(getSilverExpeditionReward("expedition_silver_t8", 2 * HOUR_MS)).toBe(100_000);
    expect(getSilverExpeditionReward("expedition_silver_t8", 6 * HOUR_MS)).toBe(300_000);
    expect(getSilverExpeditionReward("expedition_silver_t8", 12 * HOUR_MS)).toBe(600_000);
  });

  it("authors one Keeper Expedition per T4-T8 tier with one shared concurrency type", () => {
    expect(KEEPER_EXPEDITION_DEFINITIONS.map(({ tier }) => tier)).toEqual([4, 5, 6, 7, 8]);
    expect(new Set(KEEPER_EXPEDITION_DEFINITIONS.map(({ typeId }) => typeId)))
      .toEqual(new Set(["keeper"]));
  });

  it("requires both the Keeper family research and the matching Cartography tier", () => {
    for (const definition of KEEPER_EXPEDITION_DEFINITIONS) {
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: "expedition_family:keeper" },
        { type: "research_unlock", unlockId: `expedition_tier:${String(definition.tier)}` },
      ]);
    }
  });

  it("authors the validated base faction generation of one Rune per hour", () => {
    for (const definition of KEEPER_EXPEDITION_DEFINITIONS) {
      expect(definition.reward.runesPerHour).toBe(1);
      expect(definition.reward.itemId).toBe(`item_resource_rune_keeper_t${String(definition.tier)}`);
    }
    expect(getFactionExpeditionBaseRuneReward("expedition_keeper_t4", 2 * HOUR_MS)).toBe(2);
    expect(getFactionExpeditionBaseRuneReward("expedition_keeper_t4", 6 * HOUR_MS)).toBe(6);
    expect(getFactionExpeditionBaseRuneReward("expedition_keeper_t4", 12 * HOUR_MS)).toBe(12);
  });
});
