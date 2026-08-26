import { describe, expect, it } from "vitest";
import {
  FACTION_EXPEDITION_REWARD_PROFILES,
  rollFactionExpeditionReward,
} from "./factionExpeditionRewardContentCatalog.js";

describe("Faction Expedition reward content", () => {
  it("locks the validated T4-T8 EV and variance baseline", () => {
    expect(FACTION_EXPEDITION_REWARD_PROFILES).toEqual({
      4: { tier: 4, runesPerHour: 8, runeVariance: 0.20, fragmentsPerHour: 20, fragmentVariance: 0.30, completeKeysPerHourEv: 1.05 },
      5: { tier: 5, runesPerHour: 10, runeVariance: 0.20, fragmentsPerHour: 19, fragmentVariance: 0.30, completeKeysPerHourEv: 0.95 },
      6: { tier: 6, runesPerHour: 12, runeVariance: 0.20, fragmentsPerHour: 17, fragmentVariance: 0.30, completeKeysPerHourEv: 0.85 },
      7: { tier: 7, runesPerHour: 15, runeVariance: 0.20, fragmentsPerHour: 15, fragmentVariance: 0.30, completeKeysPerHourEv: 0.75 },
      8: { tier: 8, runesPerHour: 18, runeVariance: 0.20, fragmentsPerHour: 14, fragmentVariance: 0.30, completeKeysPerHourEv: 0.65 },
    });
  });

  it("never returns fractional complete keys", () => {
    const values = [0.13, 0.87, 0.31, 0.69, 0.42, 0.58, 0.21, 0.79, 0.37, 0.63];
    let index = 0;
    const random = (): number => {
      const value = values[index % values.length];
      index += 1;
      return value ?? 0.5;
    };

    for (const tier of [4, 5, 6, 7, 8] as const) {
      for (const hours of [2, 6, 12] as const) {
        const reward = rollFactionExpeditionReward(tier, hours * 60 * 60 * 1000, random);
        expect(Number.isInteger(reward.runes)).toBe(true);
        expect(Number.isInteger(reward.fragments)).toBe(true);
        expect(Number.isInteger(reward.completeKeys)).toBe(true);
        expect(reward.completeKeys).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
