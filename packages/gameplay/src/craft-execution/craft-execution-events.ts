import type { RecipeId } from "../recipes/recipe-types.js";
import type { ConsumedItem, ProducedItem } from "./craft-execution-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface ExecutionStartedEvent {
  readonly recipeId: RecipeId;
  readonly quantity: number;
}

export interface ExecutionValidatedEvent {
  readonly recipeId: RecipeId;
}

export interface ExecutionConsumedEvent {
  readonly recipeId: RecipeId;
  readonly consumed: readonly ConsumedItem[];
}

export interface ExecutionProducedEvent {
  readonly recipeId: RecipeId;
  readonly produced: readonly ProducedItem[];
}

export interface ExecutionCompletedEvent {
  readonly recipeId: RecipeId;
  readonly produced: readonly ProducedItem[];
  readonly consumed: readonly ConsumedItem[];
}

export interface ExecutionFailedEvent {
  readonly recipeId: RecipeId;
  readonly reason: string;
}

export interface ExecutionRolledBackEvent {
  readonly recipeId: RecipeId;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface CraftExecutionEventMap {
  readonly "execution:started": ExecutionStartedEvent;
  readonly "execution:validated": ExecutionValidatedEvent;
  readonly "execution:consumed": ExecutionConsumedEvent;
  readonly "execution:produced": ExecutionProducedEvent;
  readonly "execution:completed": ExecutionCompletedEvent;
  readonly "execution:failed": ExecutionFailedEvent;
  readonly "execution:rolledBack": ExecutionRolledBackEvent;
}
