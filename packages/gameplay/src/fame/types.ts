import type { Brand } from "@game/core";
import type { MasteryId } from "../experience/types.js";

/** Branded identifier for the source of fame (e.g. "mob_kill", "ore_mined"). */
export type FameSourceId = Brand<string, "FameSourceId">;

export function asFameSourceId(s: string): FameSourceId {
  return s as FameSourceId;
}

/** Category of activity that generated fame — maps to ExperienceSource. */
export type FameCategory = "combat" | "gathering" | "crafting" | "exploration";

/** Request to award fame to a mastery. */
export interface FameGainRequest {
  readonly targetMasteryId: MasteryId;
  readonly amount: number;
  readonly category: FameCategory;
  readonly sourceId?: FameSourceId | undefined;
}

export type FameFailureReason =
  | "invalid_amount"
  | "mastery_not_found"
  | "max_level_reached"
  | "category_mismatch";

export type FameResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: FameFailureReason };

/** A record of fame earned, stored in history. */
export interface FameRecord {
  readonly masteryId: MasteryId;
  readonly fameEarned: number;
  readonly category: FameCategory;
  readonly timestamp: number;
}

export function fameOk<T>(value: T): FameResult<T> {
  return { ok: true, value };
}

export function fameFail<T>(reason: FameFailureReason): FameResult<T> {
  return { ok: false, reason };
}
