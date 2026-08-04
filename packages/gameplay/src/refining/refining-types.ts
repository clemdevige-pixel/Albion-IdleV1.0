import type { Brand } from "@game/core";
import type { RecipeId } from "../recipes/recipe-types.js";
import type { CraftStationId } from "../craft-stations/craft-station-types.js";

// ---------------------------------------------------------------------------
// Branded identifier
// ---------------------------------------------------------------------------

export type RefiningSessionId = Brand<string, "RefiningSessionId">;

export function asRefiningSessionId(s: string): RefiningSessionId {
  return s as RefiningSessionId;
}

// ---------------------------------------------------------------------------
// Refining state
// ---------------------------------------------------------------------------

export type RefiningState =
  | "idle"
  | "refining"
  | "completed"
  | "cancelled"
  | "failed";

// ---------------------------------------------------------------------------
// Request / Result / Config
// ---------------------------------------------------------------------------

export interface RefiningRequest {
  readonly recipeId: RecipeId;
  readonly stationId: CraftStationId;
  readonly quantity: number;
}

export interface RefiningResultSuccess {
  readonly ok: true;
  readonly recipeId: RecipeId;
  readonly outputQuantity: number;
}

export interface RefiningResultFailure {
  readonly ok: false;
  readonly reason: string;
}

export type RefiningResult = RefiningResultSuccess | RefiningResultFailure;

export interface RefiningSessionConfig {
  readonly baseRefineTicks: number;
  /** Multiplier for speed modifiers. Default 1. */
  readonly speedModifier: number;
}
