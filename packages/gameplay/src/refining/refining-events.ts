import type { RecipeId } from "../recipes/recipe-types.js";
import type { RefiningResult, RefiningSessionId } from "./refining-types.js";

export interface RefineStartedEvent {
  readonly sessionId: RefiningSessionId;
  readonly recipeId: RecipeId;
  readonly quantity: number;
}

export interface RefineCompletedEvent {
  readonly sessionId: RefiningSessionId;
  readonly recipeId: RecipeId;
  readonly result: RefiningResult;
}

export interface RefineCancelledEvent {
  readonly sessionId: RefiningSessionId;
  readonly recipeId: RecipeId;
}

export interface RefineFailedEvent {
  readonly sessionId: RefiningSessionId;
  readonly recipeId: RecipeId;
  readonly reason: string;
}

export interface RefiningEventMap {
  readonly "refine:started": RefineStartedEvent;
  readonly "refine:completed": RefineCompletedEvent;
  readonly "refine:cancelled": RefineCancelledEvent;
  readonly "refine:failed": RefineFailedEvent;
}
