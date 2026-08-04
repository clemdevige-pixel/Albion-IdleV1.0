import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type { BiomeDefinition, BiomeId } from "./biome-types.js";
import type { BiomeRegistry } from "./biome-registry.js";

/**
 * Resolves which biome applies to a given zone definition.
 */
export class BiomeResolver {
  readonly #registry: BiomeRegistry;
  readonly #mappings = new Map<ZoneDefinitionId, BiomeId>();

  constructor(registry: BiomeRegistry) {
    this.#registry = registry;
  }

  /** Link a zone definition to a biome. */
  associate(zoneDefId: ZoneDefinitionId, biomeId: BiomeId): void {
    this.#mappings.set(zoneDefId, biomeId);
  }

  /** Remove the zone→biome mapping. */
  dissociate(zoneDefId: ZoneDefinitionId): void {
    this.#mappings.delete(zoneDefId);
  }

  /** Resolve the biome definition for a zone, or undefined if none mapped. */
  resolve(zoneDefId: ZoneDefinitionId): BiomeDefinition | undefined {
    const biomeId = this.#mappings.get(zoneDefId);
    if (biomeId === undefined) {
      return undefined;
    }
    return this.#registry.get(biomeId);
  }
}
