import type { RecipeDefinition } from "./recipe-types.js";

export type RecipeValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

const VALID_CATEGORIES = new Set(["crafting", "refining"]);

/**
 * Validates a recipe definition for structural correctness.
 */
export function validateRecipeDefinition(
  def: RecipeDefinition,
): RecipeValidationResult {
  if (!def.id) {
    return { valid: false, reason: "Recipe must have an id" };
  }

  if (!VALID_CATEGORIES.has(def.category)) {
    return { valid: false, reason: `Invalid category: "${def.category}"` };
  }

  if (def.tier < 3) {
    return { valid: false, reason: `Invalid tier: ${def.tier} (must be >= 3)` };
  }

  if (def.inputs.length === 0) {
    return { valid: false, reason: "Recipe must have at least one input" };
  }

  if (def.outputs.length === 0) {
    return { valid: false, reason: "Recipe must have at least one output" };
  }

  for (const input of def.inputs) {
    if (input.quantity <= 0) {
      return { valid: false, reason: `Input "${input.itemDefId}" has invalid quantity: ${input.quantity}` };
    }
  }

  for (const output of def.outputs) {
    if (output.quantity <= 0) {
      return { valid: false, reason: `Output "${output.itemDefId}" has invalid quantity: ${output.quantity}` };
    }
  }

  return { valid: true };
}
