export type GatheringStrikeQuality = "miss" | "correct" | "perfect";

export interface ActiveGatheringRewardState {
  readonly streak: number;
  readonly score: number;
}

export interface ActiveGatheringRewardProgress {
  readonly multiplier: 1 | 2 | 3;
  readonly nextThreshold: number | null;
  readonly progressToNext: number;
}

export const ACTIVE_GATHERING_REWARD_RULES = Object.freeze({
  speedBonusRatio: Object.freeze({
    miss: 0,
    correct: 0.02,
    perfect: 0.04,
  }),
  scorePerStrike: Object.freeze({
    miss: 0,
    correct: 8,
    perfect: 20,
  }),
  yieldTiers: Object.freeze([
    Object.freeze({ minScore: 0, multiplier: 1 as const }),
    Object.freeze({ minScore: 60, multiplier: 2 as const }),
    Object.freeze({ minScore: 140, multiplier: 3 as const }),
  ]),
});

export function applyActiveGatheringStrike(
  state: ActiveGatheringRewardState,
  quality: GatheringStrikeQuality,
): ActiveGatheringRewardState {
  if (quality === "miss") {
    return { streak: 0, score: 0 };
  }

  return {
    streak: state.streak + 1,
    score: state.score + ACTIVE_GATHERING_REWARD_RULES.scorePerStrike[quality],
  };
}

export function getActiveGatheringRewardProgress(
  score: number,
): ActiveGatheringRewardProgress {
  const normalizedScore = Math.max(0, score);
  const tiers = ACTIVE_GATHERING_REWARD_RULES.yieldTiers;
  const baseTier = tiers[0];

  if (baseTier === undefined) {
    throw new Error("Active gathering reward rules require at least one yield tier");
  }

  let current = baseTier;

  for (const tier of tiers) {
    if (normalizedScore >= tier.minScore) current = tier;
  }

  const currentIndex = tiers.indexOf(current);
  const next = tiers[currentIndex + 1];
  if (next === undefined) {
    return {
      multiplier: current.multiplier,
      nextThreshold: null,
      progressToNext: 100,
    };
  }

  const span = next.minScore - current.minScore;
  const progress = span <= 0
    ? 100
    : ((normalizedScore - current.minScore) / span) * 100;

  return {
    multiplier: current.multiplier,
    nextThreshold: next.minScore,
    progressToNext: Math.max(0, Math.min(100, progress)),
  };
}

export function getActiveGatheringRewardedQuantity(
  baseQuantity: number,
  score: number,
): number {
  const safeBaseQuantity = Math.max(0, Math.floor(baseQuantity));
  return safeBaseQuantity * getActiveGatheringRewardProgress(score).multiplier;
}
