import type { BiomeDefinition } from "./biome-types.js";

/**
 * Returns the difficulty modifier defined by the biome.
 */
export function getBiomeDifficultyModifier(biome: BiomeDefinition): number {
  return biome.difficultyModifier;
}
