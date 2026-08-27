export type GatheringStrikeQuality = "miss" | "correct" | "perfect";
export type ActiveGatheringYieldMultiplier = 1 | 1.5 | 2 | 3;

export interface ActiveGatheringBonuses {
  readonly yieldMultiplier: ActiveGatheringYieldMultiplier;
  readonly speedBonusRatio: 0 | 0.1 | 0.2 | 0.3;
  readonly nextActivityThreshold: number | null;
  readonly progressToNext: number;
}

export const ACTIVE_GATHERING_RULES = Object.freeze({
  minActivity: 0,
  maxActivity: 100,
  activityPerStrike: Object.freeze({
    miss: -35,
    correct: 15,
    perfect: 30,
  }),
  /** A full 100 -> 0 decay takes 80% of the authored cycle duration. */
  fullDecayCycleRatio: 0.8,
  /** UI cadence target; marker speed is normalized so each cycle offers ~10 useful strikes. */
  targetOpportunitiesPerCycle: 10,
  tiers: Object.freeze([
    Object.freeze({ minActivity: 0, yieldMultiplier: 1 as const, speedBonusRatio: 0 as const }),
    Object.freeze({ minActivity: 25, yieldMultiplier: 1.5 as const, speedBonusRatio: 0.1 as const }),
    Object.freeze({ minActivity: 50, yieldMultiplier: 2 as const, speedBonusRatio: 0.2 as const }),
    Object.freeze({ minActivity: 75, yieldMultiplier: 3 as const, speedBonusRatio: 0.3 as const }),
  ]),
});

export function clampActiveGatheringActivity(activity: number): number {
  return Math.max(
    ACTIVE_GATHERING_RULES.minActivity,
    Math.min(ACTIVE_GATHERING_RULES.maxActivity, activity),
  );
}

export function applyActiveGatheringStrike(
  activity: number,
  quality: GatheringStrikeQuality,
): number {
  return clampActiveGatheringActivity(
    activity + ACTIVE_GATHERING_RULES.activityPerStrike[quality],
  );
}

export function decayActiveGatheringActivity(
  activity: number,
  requiredTicks: number,
  elapsedTicks = 1,
): number {
  const safeRequiredTicks = Math.max(1, requiredTicks);
  const safeElapsedTicks = Math.max(0, elapsedTicks);
  const fullDecayTicks = Math.max(
    1,
    safeRequiredTicks * ACTIVE_GATHERING_RULES.fullDecayCycleRatio,
  );
  const decayPerTick = ACTIVE_GATHERING_RULES.maxActivity / fullDecayTicks;
  return clampActiveGatheringActivity(activity - decayPerTick * safeElapsedTicks);
}

export function getActiveGatheringBonuses(activity: number): ActiveGatheringBonuses {
  const normalizedActivity = clampActiveGatheringActivity(activity);
  const tiers = ACTIVE_GATHERING_RULES.tiers;
  const baseTier = tiers[0];
  if (baseTier === undefined) {
    throw new Error("Active gathering rules require at least one activity tier");
  }

  let current = baseTier;
  for (const tier of tiers) {
    if (normalizedActivity >= tier.minActivity) current = tier;
  }

  const currentIndex = tiers.indexOf(current);
  const next = tiers[currentIndex + 1];
  if (next === undefined) {
    return {
      yieldMultiplier: current.yieldMultiplier,
      speedBonusRatio: current.speedBonusRatio,
      nextActivityThreshold: null,
      progressToNext: 100,
    };
  }

  const span = next.minActivity - current.minActivity;
  const progress = span <= 0
    ? 100
    : ((normalizedActivity - current.minActivity) / span) * 100;

  return {
    yieldMultiplier: current.yieldMultiplier,
    speedBonusRatio: current.speedBonusRatio,
    nextActivityThreshold: next.minActivity,
    progressToNext: Math.max(0, Math.min(100, progress)),
  };
}

export function getActiveGatheringCycleYieldMultiplier(
  activity: number,
): ActiveGatheringYieldMultiplier {
  return getActiveGatheringBonuses(activity).yieldMultiplier;
}

export function getActiveGatheringRewardedQuantity(
  baseQuantity: number,
  activity: number,
  fractionalCarry = 0,
): {
  readonly quantity: number;
  readonly fractionalCarry: number;
  readonly multiplier: ActiveGatheringYieldMultiplier;
} {
  const safeBaseQuantity = Math.max(0, Math.floor(baseQuantity));
  const safeCarry = Math.max(0, Math.min(0.999999, fractionalCarry));
  const multiplier = getActiveGatheringCycleYieldMultiplier(activity);
  const exactQuantity = safeBaseQuantity * multiplier + safeCarry;
  const quantity = Math.floor(exactQuantity + Number.EPSILON);
  return {
    quantity,
    fractionalCarry: exactQuantity - quantity,
    multiplier,
  };
}

/**
 * Marker speed is normalized against the current speed bonus so the player gets
 * roughly the same number of useful strike opportunities on short and long cycles.
 */
export function getActiveGatheringMarkerSpeed(
  baseDurationSeconds: number,
  speedBonusRatio: number,
): number {
  const safeDuration = Math.max(0.1, baseDurationSeconds);
  const safeSpeedBonus = Math.max(0, speedBonusRatio);
  const effectiveDuration = safeDuration / (1 + safeSpeedBonus);
  const secondsToCenter = effectiveDuration / ACTIVE_GATHERING_RULES.targetOpportunitiesPerCycle;
  return 50 / Math.max(0.05, secondsToCenter);
}
