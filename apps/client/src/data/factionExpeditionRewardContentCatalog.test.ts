import { describe, expect, it } from "vitest";
import {
  FACTION_EXPEDITION_REWARD_PROFILES,
  rollFactionExpeditionReward,
} from "./factionExpeditionRewardContentCatalog.js";

describe("Faction Expedition reward content", () => {
  it("locks the validated T4-T8 EV and variance baseline", () => {
    expect(FACTION_EXPEDITION_REWARD_PROFILES).toEqual({
      4: { tier: 4, runesPerHour: 4, runeVariance: 0.20, fragmentsPerHour: 12, fragmentVariance: 0.30, completeKeysPerHourEv: 0.6 },
      5: { tier: 5, runesPerHour: 7, runeVariance: 0.20, fragmentsPerHour: 11, fragmentVariance: 0.30, completeKeysPerHourEv: 0.55 },
      6: { tier: 6, runesPerHour: 12.5, runeVariance: 0.20, fragmentsPerHour: 9.5, fragmentVariance: 0.30, completeKeysPerHourEv: 0.5 },
      7: { tier: 7, runesPerHour: 20, runeVariance: 0.20, fragmentsPerHour: 8.5, fragmentVariance: 0.30, completeKeysPerHourEv: 0.4 },
      8: { tier: 8, runesPerHour: 30, runeVariance: 0.20, fragmentsPerHour: 4.5, fragmentVariance: 0.30, completeKeysPerHourEv: 0.225 },
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
