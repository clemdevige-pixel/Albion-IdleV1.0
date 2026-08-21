import { describe, expect, it } from "vitest";
import {
  SILVER_EXPEDITION_DEFINITIONS,
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

  it("gates each tier through Research unlock data", () => {
    for (const definition of SILVER_EXPEDITION_DEFINITIONS) {
      expect(definition.requirements).toEqual([
        { type: "research_unlock", unlockId: `expedition_tier:${String(definition.tier)}` },
      ]);
    }
  });

  it("keeps reward/hour identical across 2h, 6h and 12h choices", () => {
    expect(getSilverExpeditionReward("expedition_silver_t4", 2 * HOUR_MS)).toBe(30_000);
    expect(getSilverExpeditionReward("expedition_silver_t4", 6 * HOUR_MS)).toBe(90_000);
    expect(getSilverExpeditionReward("expedition_silver_t4", 12 * HOUR_MS)).toBe(180_000);

    expect(getSilverExpeditionReward("expedition_silver_t8", 2 * HOUR_MS)).toBe(100_000);
    expect(getSilverExpeditionReward("expedition_silver_t8", 6 * HOUR_MS)).toBe(300_000);
    expect(getSilverExpeditionReward("expedition_silver_t8", 12 * HOUR_MS)).toBe(600_000);
  });
});
