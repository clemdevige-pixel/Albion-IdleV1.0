import type { Brand } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type CraftingSessionId = Brand<string, "CraftingSessionId">;

export function asCraftingSessionId(s: string): CraftingSessionId {
  return s as CraftingSessionId;
}

// ---------------------------------------------------------------------------
// Crafting state
// ---------------------------------------------------------------------------

export type CraftingState =
  | "idle"
  | "validating"
  | "crafting"
  | "completing"
  | "completed"
  | "cancelled"
  | "failed";

// ---------------------------------------------------------------------------
// Request / Result / Config
// ---------------------------------------------------------------------------

export interface CraftingRequest {
  readonly recipeId: string;
  readonly stationId?: string | undefined;
  readonly quantity: number;
}

export interface CraftingResultSuccess {
  readonly ok: true;
  readonly recipeId: string;
  readonly outputQuantity: number;
}

export interface CraftingResultFailure {
  readonly ok: false;
  readonly reason: string;
}

export type CraftingResult = CraftingResultSuccess | CraftingResultFailure;

export interface CraftingSessionConfig {
  readonly baseCraftTimeTicks: number;
  /** Multiplier for speed modifiers (future). Default 1. */
  readonly speedModifier: number;
  /** Multiplier for yield bonuses (future). Default 1. */
  readonly yieldModifier: number;
  /** Multiplier for quality bonuses (future). Default 1. */
  readonly qualityModifier: number;
}
