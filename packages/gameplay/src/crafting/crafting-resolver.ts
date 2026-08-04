import type {
  CraftingRequest,
  CraftingResult,
  CraftingSessionConfig,
} from "./crafting-types.js";

/**
 * Resolves the outcome of a completed crafting action.
 * Deterministic — no RNG. Extension points for yield/quality bonuses.
 */
export function resolveCraftResult(
  config: CraftingSessionConfig,
  request: CraftingRequest,
): CraftingResult {
  const outputQuantity = Math.max(
    1,
    Math.floor(request.quantity * config.yieldModifier),
  );

  return {
    ok: true,
    recipeId: request.recipeId,
    outputQuantity,
  };
}
