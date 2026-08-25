/** Canonical authored production tiers. */
export const PRODUCTION_TIERS = [3, 4, 5, 6, 7, 8] as const;
export type ProductionTier = (typeof PRODUCTION_TIERS)[number];

/** Tiers whose legacy/full production surface (including workers) is authored. */
export const PRODUCTION_CONTENT_TIERS = [3, 4, 5] as const satisfies readonly ProductionTier[];

/** Tiers whose active hero gathering content is authored. */
export const GATHERING_CONTENT_TIERS = [3, 4, 5, 6, 7, 8] as const satisfies readonly ProductionTier[];
export type GatheringContentTier = (typeof GATHERING_CONTENT_TIERS)[number];

/** Tiers whose refining recipes are authored. */
export const REFINING_CONTENT_TIERS = [3, 4, 5, 6, 7, 8] as const satisfies readonly ProductionTier[];
export type RefiningContentTier = (typeof REFINING_CONTENT_TIERS)[number];

/** Tiers whose conventional equipment crafting content is authored. */
export const CRAFTING_CONTENT_TIERS = [3, 4, 5, 6, 7, 8] as const satisfies readonly ProductionTier[];

export interface ProductionTierRules {
  readonly gatheringBaseTicks: number;
  readonly gatheringToolSpeedModifier: number;
  readonly workerSpeedModifier: number;
  readonly resourceRespawnDurationTicks: number;
}

/**
 * Canonical production cadence balance.
 * Worker tasks use the authored T3 task duration of 60 ticks as their neutral baseline.
 * Tier modifiers produce the validated mastery-0 curve:
 * T3 60, T4 72, T5 84, T6 96, T7 108, T8 120 ticks.
 * Worker mastery remains an independent multiplicative speed bonus in runtime.
 */
export const PRODUCTION_TIER_RULES = {
  3: { gatheringBaseTicks: 24, gatheringToolSpeedModifier: 1, workerSpeedModifier: 1, resourceRespawnDurationTicks: 240 },
  4: { gatheringBaseTicks: 36, gatheringToolSpeedModifier: 0.85, workerSpeedModifier: 5 / 6, resourceRespawnDurationTicks: 360 },
  5: { gatheringBaseTicks: 48, gatheringToolSpeedModifier: 1, workerSpeedModifier: 5 / 7, resourceRespawnDurationTicks: 360 },
  6: { gatheringBaseTicks: 60, gatheringToolSpeedModifier: 1, workerSpeedModifier: 5 / 8, resourceRespawnDurationTicks: 360 },
  7: { gatheringBaseTicks: 72, gatheringToolSpeedModifier: 1, workerSpeedModifier: 5 / 9, resourceRespawnDurationTicks: 360 },
  8: { gatheringBaseTicks: 84, gatheringToolSpeedModifier: 1, workerSpeedModifier: 1 / 2, resourceRespawnDurationTicks: 360 },
} as const satisfies Record<ProductionTier, ProductionTierRules>;
