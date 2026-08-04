import type { Brand } from "@game/core";
import type { RecipeCategory } from "../recipes/recipe-types.js";

// ---------------------------------------------------------------------------
// Branded identifier
// ---------------------------------------------------------------------------

export type CraftStationId = Brand<string, "CraftStationId">;

export function asCraftStationId(s: string): CraftStationId {
  return s as CraftStationId;
}

// ---------------------------------------------------------------------------
// Station type
// ---------------------------------------------------------------------------

export type CraftStationType = "crafting" | "refining" | "both";

// ---------------------------------------------------------------------------
// Station definition
// ---------------------------------------------------------------------------

export interface CraftStationDefinition {
  readonly id: CraftStationId;
  readonly displayName: string;
  readonly type: CraftStationType;
  readonly supportedRecipeCategories: readonly RecipeCategory[];
  readonly tier: number;
  readonly tags: readonly string[];
  /** Extension point: station level for future upgrade mechanics. */
  readonly level?: number | undefined;
  /** Extension point: bonus modifiers keyed by name. */
  readonly bonuses?: Readonly<Record<string, number>> | undefined;
}
