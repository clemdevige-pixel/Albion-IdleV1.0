import type { RecipeId } from "../recipes/recipe-types.js";
import type { ConsumedItem, ProducedItem } from "../craft-execution/craft-execution-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface IntegrationCraftCompletedEvent {
  readonly recipeId: RecipeId;
  readonly outputs: readonly ProducedItem[];
  readonly consumed: readonly ConsumedItem[];
}

export interface IntegrationCraftFailedEvent {
  readonly recipeId: RecipeId;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface CraftingIntegrationEventMap {
  readonly "integration:craftCompleted": IntegrationCraftCompletedEvent;
  readonly "integration:craftFailed": IntegrationCraftFailedEvent;
}
