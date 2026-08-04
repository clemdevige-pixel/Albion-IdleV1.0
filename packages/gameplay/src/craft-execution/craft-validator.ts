import type { RecipeRegistry } from "../recipes/recipe-registry.js";
import type { CraftStationRegistry } from "../craft-stations/craft-station-registry.js";
import type { CraftExecutionRequest } from "./craft-execution-types.js";

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface CraftValidationSuccess {
  readonly ok: true;
}

export interface CraftValidationFailure {
  readonly ok: false;
  readonly reason: string;
}

export type CraftValidationResult = CraftValidationSuccess | CraftValidationFailure;

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export class CraftValidator {
  validateCraft(
    request: CraftExecutionRequest,
    recipeRegistry: RecipeRegistry,
    stationRegistry?: CraftStationRegistry,
  ): CraftValidationResult {
    // Check recipe exists
    const recipe = recipeRegistry.get(request.recipeId);
    if (recipe === undefined) {
      return { ok: false, reason: `Recipe "${request.recipeId}" not found` };
    }

    // Check quantity
    if (request.quantity < 1) {
      return { ok: false, reason: "Quantity must be at least 1" };
    }

    // Check station supports recipe category
    if (request.stationId !== undefined && stationRegistry !== undefined) {
      const station = stationRegistry.get(request.stationId);
      if (station === undefined) {
        return { ok: false, reason: `Station "${request.stationId}" not found` };
      }
      if (!station.supportedRecipeCategories.includes(recipe.category)) {
        return {
          ok: false,
          reason: `Station "${request.stationId}" does not support category "${recipe.category}"`,
        };
      }
    }

    // Check recipe has ingredients
    if (recipe.inputs.length === 0) {
      return { ok: false, reason: "Recipe has no ingredients" };
    }

    return { ok: true };
  }
}
