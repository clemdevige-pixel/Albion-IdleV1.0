import type { BiomeDefinition, BiomeId } from "./biome-types.js";

/**
 * Stores biome definitions. Pure data container — no side effects.
 */
export class BiomeRegistry {
  readonly #definitions = new Map<BiomeId, BiomeDefinition>();

  register(definition: BiomeDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Biome definition "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: BiomeId): BiomeDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: BiomeId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly BiomeDefinition[] {
    return [...this.#definitions.values()];
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
