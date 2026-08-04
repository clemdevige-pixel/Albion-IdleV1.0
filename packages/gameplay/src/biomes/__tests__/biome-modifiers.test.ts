import { describe, it, expect } from "vitest";
import { getBiomeDifficultyModifier } from "../biome-modifiers.js";
import type { BiomeDefinition } from "../biome-types.js";
import { asBiomeId } from "../biome-types.js";

function makeBiome(modifier: number): BiomeDefinition {
  return {
    id: asBiomeId("biome_test"),
    name: "Test Biome",
    theme: "desert",
    difficultyModifier: modifier,
    enemyFamilies: [],
    resourceFamilies: [],
    encounterPoolId: "pool_test",
    visualThemeId: "vis_test",
    ambientAudioId: "amb_test",
    musicPlaylistId: "music_test",
    weather: undefined,
    lighting: "bright",
    decorationDensity: "Sparse",
    tags: [],
  };
}

describe("getBiomeDifficultyModifier", () => {
  it("returns the difficultyModifier from the biome", () => {
    expect(getBiomeDifficultyModifier(makeBiome(1.0))).toBe(1.0);
    expect(getBiomeDifficultyModifier(makeBiome(2.5))).toBe(2.5);
    expect(getBiomeDifficultyModifier(makeBiome(0))).toBe(0);
  });
});
