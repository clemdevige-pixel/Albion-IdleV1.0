import { getEnchantmentShardItemId } from "@game/gameplay";

export type GeneralistExpeditionTier = 4 | 5 | 6 | 7 | 8;
export type GeneralistExpeditionResultQuality = "difficile" | "reussie" | "fructueuse" | "exceptionnelle";

export interface GeneralistExpeditionRewardProfile {
  readonly tier: GeneralistExpeditionTier;
  readonly silverPerHour: number;
  readonly silverVariance: number;
  readonly shardsPerHour: number;
  readonly shardVariance: number;
}

export interface RolledGeneralistExpeditionReward {
  readonly silver: number;
  readonly shardItemId: string;
  readonly shards: number;
  readonly quality: GeneralistExpeditionResultQuality;
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

function assertTier(tier: number): GeneralistExpeditionTier {
  if (tier !== 4 && tier !== 5 && tier !== 6 && tier !== 7 && tier !== 8) {
    throw new Error(`Unsupported Generalist Expedition tier: ${String(tier)}`);
  }
  return tier;
}

function hoursFromDuration(durationMs: number): number {
  const hours = durationMs / (60 * 60 * 1000);
  if (!Number.isSafeInteger(hours) || hours <= 0) {
    throw new Error(`Generalist Expedition duration must be a positive whole number of hours: ${String(durationMs)}`);
  }
  return hours;
}

/** Symmetric triangular draw around the authored hourly EV. */
function rollCenteredInteger(mean: number, variance: number, random: () => number): number {
  const centered = random() + random() - 1;
  return Math.max(1, Math.round(mean * (1 + centered * variance)));
}

/**
 * Rolls each hour independently, preserving EV/hour while making longer
 * expeditions statistically more stable in relative terms.
 */
function rollHourlyTotal(
  ratePerHour: number,
  variance: number,
  hours: number,
  random: () => number,
): number {
  let total = 0;
  for (let hour = 0; hour < hours; hour += 1) {
    total += rollCenteredInteger(ratePerHour, variance, random);
  }
  return total;
}

function qualityFromRatios(
  silverRatio: number,
  shardRatio: number,
): GeneralistExpeditionResultQuality {
  const score = (silverRatio + shardRatio) / 2;
  if (score < 0.85) return "difficile";
  if (score < 1.10) return "reussie";
  if (score < 1.30) return "fructueuse";
  return "exceptionnelle";
}

export function getGeneralistExpeditionRewardProfile(
  tier: number,
): GeneralistExpeditionRewardProfile {
  return GENERALIST_EXPEDITION_REWARD_PROFILES[assertTier(tier)];
}

export function rollGeneralistExpeditionReward(
  tier: number,
  durationMs: number,
  random: () => number = Math.random,
): RolledGeneralistExpeditionReward {
  const resolvedTier = assertTier(tier);
  const profile = GENERALIST_EXPEDITION_REWARD_PROFILES[resolvedTier];
  const hours = hoursFromDuration(durationMs);
  const silverMean = profile.silverPerHour * hours;
  const shardMean = profile.shardsPerHour * hours;

  const silver = rollHourlyTotal(profile.silverPerHour, profile.silverVariance, hours, random);
  const shards = rollHourlyTotal(profile.shardsPerHour, profile.shardVariance, hours, random);

  return {
    silver,
    shardItemId: getEnchantmentShardItemId(resolvedTier),
    shards,
    quality: qualityFromRatios(silver / silverMean, shards / shardMean),
  };
}
