import type {
  RecipeDefinition,
  RecipeId,
  RecipeCategory,
} from "./recipe-types.js";

/**
 * Stores recipe definitions. Pure data container — no side effects.
 */
export class RecipeRegistry {
  readonly #definitions = new Map<RecipeId, RecipeDefinition>();

  register(definition: RecipeDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Recipe "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: RecipeId): RecipeDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: RecipeId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly RecipeDefinition[] {
    return [...this.#definitions.values()];
  }

  getByCategory(category: RecipeCategory): readonly RecipeDefinition[] {
    return [...this.#definitions.values()].filter((d) => d.category === category);
  }

  getByStation(stationId: string): readonly RecipeDefinition[] {
    return [...this.#definitions.values()].filter((d) => d.requiredStation === stationId);
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
