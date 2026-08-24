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
      [4, 30_000, 46, 0.20, 0.25],
      [5, 55_000, 47, 0.20, 0.25],
      [6, 70_000, 50, 0.20, 0.25],
      [7, 80_000, 43, 0.20, 0.25],
      [8, 90_000, 38, 0.20, 0.25],
    ]);
  });

  it("returns centered integer rewards and matching-tier shards", () => {
    const reward = rollGeneralistExpeditionReward(4, 2 * HOUR_MS, () => 0.5);
    expect(reward).toEqual({
      silver: 60_000,
      shardItemId: getEnchantmentShardItemId(4),
      shards: 92,
      quality: "reussie",
    });
    expect(Number.isInteger(reward.silver)).toBe(true);
    expect(Number.isInteger(reward.shards)).toBe(true);
  });
});
