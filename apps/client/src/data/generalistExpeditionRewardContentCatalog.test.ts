import { describe, expect, it } from "vitest";
import { getEnchantmentShardItemId } from "@game/gameplay";
import {
  GENERALIST_EXPEDITION_REWARD_PROFILES,
  rollGeneralistExpeditionReward,
} from "./generalistExpeditionRewardContentCatalog.js";

const HOUR_MS = 60 * 60 * 1000;

describe("generalistExpeditionRewardContentCatalog", () => {
  it("authors the validated T4-T8 Silver and shard baselines", () => {
    expect(Object.values(GENERALIST_EXPEDITION_REWARD_PROFILES).map((profile) => [
      profile.tier,
      profile.silverPerHour,
      profile.shardsPerHour,
      profile.silverVariance,
      profile.shardVariance,
    ])).toEqual([
      [4, 40_000, 23, 0.20, 0.25],
      [5, 70_000, 23.5, 0.20, 0.25],
      [6, 90_000, 25, 0.20, 0.25],
      [7, 105_000, 21.5, 0.20, 0.25],
      [8, 115_000, 19, 0.20, 0.25],
    ]);
  });

  it("returns centered integer rewards and matching-tier shards", () => {
    const reward = rollGeneralistExpeditionReward(4, 2 * HOUR_MS, () => 0.5);
    expect(reward).toEqual({
      silver: 80_000,
      shardItemId: getEnchantmentShardItemId(4),
      shards: 46,
      quality: "reussie",
    });
    expect(Number.isInteger(reward.silver)).toBe(true);
    expect(Number.isInteger(reward.shards)).toBe(true);
  });
});
