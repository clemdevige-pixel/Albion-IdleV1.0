import type { RecipeId } from "../recipes/recipe-types.js";
import type { CraftStationId } from "../craft-stations/craft-station-types.js";
// ---------------------------------------------------------------------------
// Transaction state
// ---------------------------------------------------------------------------

export type TransactionState =
  | "pending"
  | "consuming"
  | "producing"
  | "completed"
  | "rolledBack";

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface CraftExecutionRequest {
  readonly recipeId: RecipeId;
  readonly stationId?: CraftStationId | undefined;
  readonly quantity: number;
}

// ---------------------------------------------------------------------------
// Ingredient check result
// ---------------------------------------------------------------------------

export interface IngredientCheckResult {
  readonly available: boolean;
  readonly missing: readonly {
    readonly itemDefId: string;
    readonly needed: number;
    readonly have: number;
  }[];
}

// ---------------------------------------------------------------------------
// Consumed / Produced tracking
// ---------------------------------------------------------------------------

export interface ConsumedItem {
  readonly itemDefId: string;
  readonly quantity: number;
  readonly tier?: number | undefined;
}

export interface ProducedItem {
  readonly itemDefId: string;
  readonly quantity: number;
  readonly tier?: number | undefined;
}

// ---------------------------------------------------------------------------
// Execution result
// ---------------------------------------------------------------------------

export interface CraftExecutionSuccess {
  readonly ok: true;
  readonly recipeId: RecipeId;
  readonly produced: readonly ProducedItem[];
  readonly consumed: readonly ConsumedItem[];
}

export interface CraftExecutionFailure {
  readonly ok: false;
  readonly reason: string;
  readonly rolledBack: boolean;
}

export type CraftExecutionResult = CraftExecutionSuccess | CraftExecutionFailure;
