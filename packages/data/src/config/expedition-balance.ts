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
  4: { tier: 4, silverPerHour: 30_000, silverVariance: 0.20, shardsPerHour: 46, shardVariance: 0.25 },
  5: { tier: 5, silverPerHour: 55_000, silverVariance: 0.20, shardsPerHour: 47, shardVariance: 0.25 },
  6: { tier: 6, silverPerHour: 70_000, silverVariance: 0.20, shardsPerHour: 50, shardVariance: 0.25 },
  7: { tier: 7, silverPerHour: 80_000, silverVariance: 0.20, shardsPerHour: 43, shardVariance: 0.25 },
  8: { tier: 8, silverPerHour: 90_000, silverVariance: 0.20, shardsPerHour: 38, shardVariance: 0.25 },
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
  4: { tier: 4, runesPerHour: 8, runeVariance: 0.20, fragmentsPerHour: 24, fragmentVariance: 0.30, completeKeysPerHourEv: 1.2 },
  5: { tier: 5, runesPerHour: 14, runeVariance: 0.20, fragmentsPerHour: 22, fragmentVariance: 0.30, completeKeysPerHourEv: 1.1 },
  6: { tier: 6, runesPerHour: 25, runeVariance: 0.20, fragmentsPerHour: 19, fragmentVariance: 0.30, completeKeysPerHourEv: 1.0 },
  7: { tier: 7, runesPerHour: 40, runeVariance: 0.20, fragmentsPerHour: 17, fragmentVariance: 0.30, completeKeysPerHourEv: 0.8 },
  8: { tier: 8, runesPerHour: 60, runeVariance: 0.20, fragmentsPerHour: 9, fragmentVariance: 0.30, completeKeysPerHourEv: 0.45 },
};
