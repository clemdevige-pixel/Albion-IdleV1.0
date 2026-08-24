import { getFactionRuneItemId } from "@game/data";
import { getDungeonKeyFragmentItemId, getDungeonKeyItemId } from "./dungeonKeyContentCatalog.js";

export type FactionExpeditionTier = 4 | 5 | 6 | 7 | 8;
export type FactionExpeditionResultQuality = "difficile" | "reussie" | "fructueuse" | "exceptionnelle";

export interface FactionExpeditionRewardProfile {
  readonly tier: FactionExpeditionTier;
  readonly runesPerHour: number;
  readonly runeVariance: number;
  readonly fragmentsPerHour: number;
  readonly fragmentVariance: number;
  readonly completeKeysPerHourEv: number;
}

export interface RolledFactionExpeditionReward {
  readonly runeItemId: string;
  readonly runes: number;
  readonly fragmentItemId: string;
  readonly fragments: number;
  readonly keyItemId: string;
  readonly completeKeys: number;
  readonly quality: FactionExpeditionResultQuality;
}

export const FACTION_EXPEDITION_REWARD_PROFILES: Readonly<Record<FactionExpeditionTier, FactionExpeditionRewardProfile>> = {
  4: { tier: 4, runesPerHour: 8, runeVariance: 0.20, fragmentsPerHour: 24, fragmentVariance: 0.30, completeKeysPerHourEv: 1.2 },
  5: { tier: 5, runesPerHour: 14, runeVariance: 0.20, fragmentsPerHour: 22, fragmentVariance: 0.30, completeKeysPerHourEv: 1.1 },
  6: { tier: 6, runesPerHour: 25, runeVariance: 0.20, fragmentsPerHour: 19, fragmentVariance: 0.30, completeKeysPerHourEv: 1.0 },
  7: { tier: 7, runesPerHour: 40, runeVariance: 0.20, fragmentsPerHour: 17, fragmentVariance: 0.30, completeKeysPerHourEv: 0.8 },
  8: { tier: 8, runesPerHour: 60, runeVariance: 0.20, fragmentsPerHour: 9, fragmentVariance: 0.30, completeKeysPerHourEv: 0.45 },
};

function assertTier(tier: number): FactionExpeditionTier {
  if (tier !== 4 && tier !== 5 && tier !== 6 && tier !== 7 && tier !== 8) {
    throw new Error(`Unsupported Faction Expedition tier: ${String(tier)}`);
  }
  return tier;
}

function hoursFromDuration(durationMs: number): number {
  const hours = durationMs / (60 * 60 * 1000);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error(`Invalid Faction Expedition duration: ${String(durationMs)}`);
  }
  return hours;
}

function centeredFactor(variance: number, random: () => number): number {
  return 1 + (random() + random() - 1) * variance;
}

/** Independent hourly triangular draws preserve EV/h while making longer Expeditions relatively more stable. */
function rollCenteredDurationTotal(
  ratePerHour: number,
  hours: number,
  variance: number,
  random: () => number,
): number {
  const fullHours = Math.floor(hours);
  const remainderHours = hours - fullHours;
  let total = 0;
  for (let index = 0; index < fullHours; index += 1) {
    total += ratePerHour * centeredFactor(variance, random);
  }
  if (remainderHours > 0) {
    total += ratePerHour * remainderHours * centeredFactor(variance, random);
  }
  return Math.max(1, Math.round(total));
}

/** Integer-only Poisson draw. Mean and variance both equal lambda; no fractional key can ever be credited. */
function rollPoisson(lambda: number, random: () => number): number {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let product = 1;
  let draws = 0;
  do {
    draws += 1;
    product *= Math.max(Number.EPSILON, random());
  } while (product > limit);
  return draws - 1;
}

function qualityFromRatios(runeRatio: number, fragmentRatio: number, keyRatio: number): FactionExpeditionResultQuality {
  const score = (runeRatio + fragmentRatio + keyRatio) / 3;
  if (score < 0.85) return "difficile";
  if (score < 1.10) return "reussie";
  if (score < 1.30) return "fructueuse";
  return "exceptionnelle";
}

export function getFactionExpeditionRewardProfile(tier: number): FactionExpeditionRewardProfile {
  return FACTION_EXPEDITION_REWARD_PROFILES[assertTier(tier)];
}

export function rollFactionExpeditionReward(
  tier: number,
  durationMs: number,
  random: () => number = Math.random,
): RolledFactionExpeditionReward {
  const resolvedTier = assertTier(tier);
  const profile = FACTION_EXPEDITION_REWARD_PROFILES[resolvedTier];
  const hours = hoursFromDuration(durationMs);

  const runeMean = profile.runesPerHour * hours;
  const fragmentMean = profile.fragmentsPerHour * hours;
  const keyMean = profile.completeKeysPerHourEv * hours;

  const runes = rollCenteredDurationTotal(profile.runesPerHour, hours, profile.runeVariance, random);
  const fragments = rollCenteredDurationTotal(profile.fragmentsPerHour, hours, profile.fragmentVariance, random);
  const completeKeys = rollPoisson(keyMean, random);

  return {
    runeItemId: getFactionRuneItemId(resolvedTier),
    runes,
    fragmentItemId: getDungeonKeyFragmentItemId(resolvedTier),
    fragments,
    keyItemId: getDungeonKeyItemId(resolvedTier),
    completeKeys,
    quality: qualityFromRatios(
      runes / runeMean,
      fragments / fragmentMean,
      keyMean <= 0 ? 1 : completeKeys / keyMean,
    ),
  };
}
