import {
  GENERALIST_EXPEDITION_REWARD_PROFILES,
  type GeneralistExpeditionRewardProfile,
  type GeneralistExpeditionTier,
} from "@game/data";
import { getEnchantmentShardItemId } from "@game/gameplay";

export type GeneralistExpeditionResultQuality = "difficile" | "reussie" | "fructueuse" | "exceptionnelle";

export interface RolledGeneralistExpeditionReward {
  readonly silver: number;
  readonly shardItemId: string;
  readonly shards: number;
  readonly quality: GeneralistExpeditionResultQuality;
}

export {
  GENERALIST_EXPEDITION_REWARD_PROFILES,
  type GeneralistExpeditionRewardProfile,
  type GeneralistExpeditionTier,
} from "@game/data";

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

function rollCenteredInteger(mean: number, variance: number, random: () => number): number {
  const centered = random() + random() - 1;
  return Math.max(1, Math.round(mean * (1 + centered * variance)));
}

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
