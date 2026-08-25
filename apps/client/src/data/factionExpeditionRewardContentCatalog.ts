import {
  FACTION_EXPEDITION_REWARD_PROFILES,
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
  getFactionRuneItemId,
  type FactionExpeditionRewardProfile,
  type FactionExpeditionTier,
} from "@game/data";

export type FactionExpeditionResultQuality = "difficile" | "reussie" | "fructueuse" | "exceptionnelle";

export interface RolledFactionExpeditionReward {
  readonly runeItemId: string;
  readonly runes: number;
  readonly fragmentItemId: string;
  readonly fragments: number;
  readonly keyItemId: string;
  readonly completeKeys: number;
  readonly quality: FactionExpeditionResultQuality;
}

export {
  FACTION_EXPEDITION_REWARD_PROFILES,
  type FactionExpeditionRewardProfile,
  type FactionExpeditionTier,
} from "@game/data";

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

function qualityFromRatios(
  runeRatio: number,
  fragmentRatio: number,
  keyRatio: number,
): FactionExpeditionResultQuality {
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
