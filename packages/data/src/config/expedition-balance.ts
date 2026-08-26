export type GeneralistExpeditionTier = 4 | 5 | 6 | 7 | 8;

export interface GeneralistExpeditionRewardProfile {
  readonly tier: GeneralistExpeditionTier;
  readonly silverPerHour: number;
  readonly silverVariance: number;
  readonly shardsPerHour: number;
  readonly shardVariance: number;
}

/**
 * Tester baseline calibrated against the deepest farmable Tn.3 world reference.
 * T8 remains provisional until Blackspire can be benchmarked reliably.
 */
export const GENERALIST_EXPEDITION_REWARD_PROFILES: Readonly<
  Record<GeneralistExpeditionTier, GeneralistExpeditionRewardProfile>
> = {
  4: { tier: 4, silverPerHour: 30_000, silverVariance: 0.20, shardsPerHour: 23, shardVariance: 0.25 },
  5: { tier: 5, silverPerHour: 55_000, silverVariance: 0.20, shardsPerHour: 23.5, shardVariance: 0.25 },
  6: { tier: 6, silverPerHour: 70_000, silverVariance: 0.20, shardsPerHour: 25, shardVariance: 0.25 },
  7: { tier: 7, silverPerHour: 80_000, silverVariance: 0.20, shardsPerHour: 21.5, shardVariance: 0.25 },
  8: { tier: 8, silverPerHour: 90_000, silverVariance: 0.20, shardsPerHour: 19, shardVariance: 0.25 },
};

export type FactionExpeditionTier = 4 | 5 | 6 | 7 | 8;

export interface FactionExpeditionRewardProfile {
  readonly tier: FactionExpeditionTier;
  readonly runesPerHour: number;
  readonly runeVariance: number;
  readonly fragmentsPerHour: number;
  readonly fragmentVariance: number;
  readonly completeKeysPerHourEv: number;
}

export const FACTION_EXPEDITION_REWARD_PROFILES: Readonly<
  Record<FactionExpeditionTier, FactionExpeditionRewardProfile>
> = {
  4: { tier: 4, runesPerHour: 8, runeVariance: 0.20, fragmentsPerHour: 12, fragmentVariance: 0.30, completeKeysPerHourEv: 0.6 },
  5: { tier: 5, runesPerHour: 10, runeVariance: 0.20, fragmentsPerHour: 11, fragmentVariance: 0.30, completeKeysPerHourEv: 0.55 },
  6: { tier: 6, runesPerHour: 12, runeVariance: 0.20, fragmentsPerHour: 9.5, fragmentVariance: 0.30, completeKeysPerHourEv: 0.5 },
  7: { tier: 7, runesPerHour: 15, runeVariance: 0.20, fragmentsPerHour: 8.5, fragmentVariance: 0.30, completeKeysPerHourEv: 0.4 },
  8: { tier: 8, runesPerHour: 18, runeVariance: 0.20, fragmentsPerHour: 4.5, fragmentVariance: 0.30, completeKeysPerHourEv: 0.225 },
};
