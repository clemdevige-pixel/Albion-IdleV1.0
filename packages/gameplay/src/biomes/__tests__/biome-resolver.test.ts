import { describe, it, expect, beforeEach } from "vitest";
import { BiomeRegistry } from "../biome-registry.js";
import { BiomeResolver } from "../biome-resolver.js";
import type { BiomeDefinition } from "../biome-types.js";
import { asBiomeId } from "../biome-types.js";
import { asZoneDefinitionId } from "../../zones/zone-types.js";

function makeBiome(id: string): BiomeDefinition {
  return {
    id: asBiomeId(id),
    name: `Biome ${id}`,
    theme: "swamp",
    difficultyModifier: 1.5,
    enemyFamilies: ["beast"],
    resourceFamilies: ["herb"],
    encounterPoolId: "pool_swamp",
    visualThemeId: "vis_swamp",
    ambientAudioId: "amb_swamp",
    musicPlaylistId: "music_swamp",
    weather: "rain",
    lighting: "overcast",
    decorationDensity: "Dense",
    tags: ["swamp"],
  };
}

describe("BiomeResolver", () => {
  let registry: BiomeRegistry;
  let resolver: BiomeResolver;

  beforeEach(() => {
    registry = new BiomeRegistry();
    resolver = new BiomeResolver(registry);
  });

  it("resolves a biome for an associated zone", () => {
    const biome = makeBiome("biome_swamp");
    registry.register(biome);
    const zoneDefId = asZoneDefinitionId("zone_marsh");
    resolver.associate(zoneDefId, biome.id);
    expect(resolver.resolve(zoneDefId)).toBe(biome);
  });

  it("returns undefined for an unknown zone", () => {
    expect(resolver.resolve(asZoneDefinitionId("unknown"))).toBeUndefined();
  });

  it("returns undefined after dissociation", () => {
    const biome = makeBiome("biome_x");
    registry.register(biome);
    const zoneDefId = asZoneDefinitionId("zone_y");
    resolver.associate(zoneDefId, biome.id);
    resolver.dissociate(zoneDefId);
    expect(resolver.resolve(zoneDefId)).toBeUndefined();
  });

  it("returns undefined when biome id is mapped but not in registry", () => {
    const zoneDefId = asZoneDefinitionId("zone_z");
    resolver.associate(zoneDefId, asBiomeId("missing_biome"));
    expect(resolver.resolve(zoneDefId)).toBeUndefined();
  });
});
