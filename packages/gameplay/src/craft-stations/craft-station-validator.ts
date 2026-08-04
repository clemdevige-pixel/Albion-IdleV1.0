import type { CraftStationDefinition } from "./craft-station-types.js";

export type StationValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

const VALID_TYPES = new Set(["crafting", "refining", "both"]);

/**
 * Validates a craft-station definition for structural correctness.
 */
export function validateStationDefinition(
  def: CraftStationDefinition,
): StationValidationResult {
  if (!def.id) {
    return { valid: false, reason: "Station must have an id" };
  }

  if (!def.displayName) {
    return { valid: false, reason: "Station must have a displayName" };
  }

  if (!VALID_TYPES.has(def.type)) {
    return { valid: false, reason: `Invalid type: "${def.type}"` };
  }

  if (def.tier < 3) {
    return { valid: false, reason: `Invalid tier: ${def.tier} (must be >= 3)` };
  }

  if (def.supportedRecipeCategories.length === 0) {
    return {
      valid: false,
      reason: "Station must support at least one recipe category",
    };
  }

  return { valid: true };
}
