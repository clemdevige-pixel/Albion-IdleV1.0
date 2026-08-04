import type { Brand } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifier
// ---------------------------------------------------------------------------

export type RecipeId = Brand<string, "RecipeId">;

export function asRecipeId(s: string): RecipeId {
  return s as RecipeId;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export type RecipeCategory = "crafting" | "refining";

// ---------------------------------------------------------------------------
// Ingredient / Output
// ---------------------------------------------------------------------------

export interface RecipeIngredient {
  readonly itemDefId: string;
  readonly quantity: number;
  readonly tier?: number | undefined;
}

export interface RecipeOutput {
  readonly itemDefId: string;
  readonly quantity: number;
  readonly tier?: number | undefined;
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export interface RecipeRequirements {
  readonly masteryLevel: number;
  readonly stationId?: string | undefined;
}

// ---------------------------------------------------------------------------
// Recipe definition
// ---------------------------------------------------------------------------

export interface RecipeDefinition {
  readonly id: RecipeId;
  readonly category: RecipeCategory;
  readonly tier: number;
  readonly requiredStation: string;
  readonly inputs: readonly RecipeIngredient[];
  readonly outputs: readonly RecipeOutput[];
  readonly craftDurationTicks: number;
  readonly requiredMasteryLevel: number;
  readonly tags: readonly string[];
  readonly unlockConditions?: readonly string[] | undefined;
}
