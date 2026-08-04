import type { RecipeDefinition, RecipeId } from "./recipe-types.js";
import type { RecipeRegistry } from "./recipe-registry.js";

export type RecipeResolveResult =
  | { readonly ok: true; readonly recipe: RecipeDefinition }
  | { readonly ok: false; readonly reason: string };

/**
 * Resolves a recipe by id from the registry.
 */
export function resolveRecipe(
  recipeId: RecipeId,
  registry: RecipeRegistry,
): RecipeResolveResult {
  const recipe = registry.get(recipeId);
  if (recipe === undefined) {
    return { ok: false, reason: `Recipe "${recipeId}" not found` };
  }
  return { ok: true, recipe };
}
