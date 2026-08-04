import { describe, it, expect, beforeEach } from "vitest";
import { BiomeRegistry } from "../biome-registry.js";
import type { BiomeDefinition } from "../biome-types.js";
import { asBiomeId } from "../biome-types.js";

function makeBiome(id: string, name?: string): BiomeDefinition {
  return {
    id: asBiomeId(id),
    name: name ?? `Biome ${id}`,
    theme: "dark_forest",
    difficultyModifier: 1.2,
    enemyFamilies: ["undead"],
    resourceFamilies: ["wood"],
    encounterPoolId: "pool_forest",
    visualThemeId: "vis_forest",
    ambientAudioId: "amb_forest",
    musicPlaylistId: "music_forest",
    weather: undefined,
    lighting: "dim",
    decorationDensity: "Normal",
    tags: ["forest"],
  };
}

describe("BiomeRegistry", () => {
  let registry: BiomeRegistry;

  beforeEach(() => {
    registry = new BiomeRegistry();
  });

  it("registers and retrieves a definition", () => {
    const def = makeBiome("biome_forest");
    registry.register(def);
    expect(registry.get(def.id)).toBe(def);
    expect(registry.has(def.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asBiomeId("nope"))).toBeUndefined();
    expect(registry.has(asBiomeId("nope"))).toBe(false);
  });

  it("throws on duplicate registration", () => {
    const def = makeBiome("biome_a");
    registry.register(def);
    expect(() => registry.register(def)).toThrow("already registered");
  });

  it("getAll returns all registered definitions", () => {
    registry.register(makeBiome("a"));
    registry.register(makeBiome("b"));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("clear removes all definitions", () => {
    registry.register(makeBiome("x"));
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });
});
