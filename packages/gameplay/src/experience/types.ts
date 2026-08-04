import type { Brand } from "@game/core";

/** Branded mastery identifier (28_EXPERIENCE_SYSTEM). */
export type MasteryId = Brand<string, "MasteryId">;

export function asMasteryId(s: string): MasteryId {
  return s as MasteryId;
}

/** Source that granted the experience (28_EXPERIENCE_SYSTEM). */
export type ExperienceSource =
  | "combat"
  | "gathering"
  | "crafting"
  | "exploration"
  | "quest";

export type ExperienceFailureReason =
  | "mastery_not_found"
  | "mastery_not_registered"
  | "invalid_amount"
  | "max_level_reached";

export type ExperienceGainResult =
  | { readonly ok: true; readonly value: ExperienceGainValue }
  | { readonly ok: false; readonly reason: ExperienceFailureReason };

/** Snapshot of a mastery's current progress. */
export interface MasteryProgress {
  readonly masteryId: MasteryId;
  readonly level: number;
  readonly currentXp: number;
  readonly totalLifetimeXp: number;
}

export interface ExperienceGainValue {
  readonly masteryId: MasteryId;
  readonly xpAdded: number;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly currentXp: number;
  readonly levelsGained: number;
}

export function experienceOk(value: ExperienceGainValue): ExperienceGainResult {
  return { ok: true, value };
}

export function experienceFail(reason: ExperienceFailureReason): ExperienceGainResult {
  return { ok: false, reason };
}
