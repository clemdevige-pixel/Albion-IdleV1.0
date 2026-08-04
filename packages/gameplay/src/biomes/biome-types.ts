import type { Brand } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifier
// ---------------------------------------------------------------------------

export type BiomeId = Brand<string, "BiomeId">;

export function asBiomeId(s: string): BiomeId {
  return s as BiomeId;
}

// ---------------------------------------------------------------------------
// Biome Definition
// ---------------------------------------------------------------------------

export type DecorationDensity = "Sparse" | "Normal" | "Dense";

/** Static, immutable description of a biome. */
export interface BiomeDefinition {
  readonly id: BiomeId;
  readonly name: string;
  readonly theme: string;
  readonly difficultyModifier: number;
  readonly enemyFamilies: readonly string[];
  readonly resourceFamilies: readonly string[];
  readonly encounterPoolId: string;
  readonly visualThemeId: string;
  readonly ambientAudioId: string;
  readonly musicPlaylistId: string;
  readonly weather: string | undefined;
  readonly lighting: string;
  readonly decorationDensity: DecorationDensity;
  readonly tags: readonly string[];
}
