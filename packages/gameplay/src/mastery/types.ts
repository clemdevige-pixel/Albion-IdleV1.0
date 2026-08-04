export { type MasteryId, asMasteryId } from "../experience/types.js";

/** Structural interface for mastery definitions (29_MASTERY_SYSTEM). */
export interface MasteryDefinitionLike {
  readonly id: string;
  readonly category: string;
  readonly maxLevel: number;
  readonly experiencePerLevel: readonly number[];
}

/** Runtime state of a single mastery. */
export interface MasteryState {
  readonly masteryId: MasteryId;
  readonly isUnlocked: boolean;
  readonly level: number;
  readonly currentXp: number;
  readonly totalLifetimeXp: number;
}

/** Configuration for the overflow XP pool. */
export interface OverflowConfig {
  readonly conversionRate: number;
  readonly enabled: boolean;
}

export type MasteryFailureReason =
  | "mastery_not_found"
  | "mastery_already_unlocked"
  | "mastery_locked"
  | "invalid_definition"
  | "overflow_disabled"
  | "insufficient_overflow"
  | "overflow_cap_reached"
  | "invalid_amount";

export type MasteryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: MasteryFailureReason };

import type { MasteryId } from "../experience/types.js";
