import type { RecipeId } from "../recipes/recipe-types.js";
import type { CraftStationId } from "../craft-stations/craft-station-types.js";
import type { TransactionState } from "../craft-execution/craft-execution-types.js";

// ---------------------------------------------------------------------------
// Save state
// ---------------------------------------------------------------------------

export interface CraftingSessionSaveState {
  readonly recipeId: RecipeId;
  readonly stationId?: CraftStationId | undefined;
  readonly quantity: number;
  readonly state: TransactionState;
  readonly startedAt: number;
}

export interface CraftingSaveState {
  readonly activeSessions: readonly CraftingSessionSaveState[];
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

export function serializeCraftingSaveState(
  state: CraftingSaveState,
): string {
  return JSON.stringify(state);
}

export function deserializeCraftingSaveState(
  json: string,
): CraftingSaveState {
  return JSON.parse(json) as CraftingSaveState;
}
