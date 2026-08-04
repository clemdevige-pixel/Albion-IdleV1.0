import type { ResourceDefinition, ResourceDefinitionId, ResourceFamily } from "./resource-types.js";

/**
 * Stores resource definitions. Pure data container — no side effects.
 */
export class ResourceRegistry {
  readonly #definitions = new Map<ResourceDefinitionId, ResourceDefinition>();

  register(definition: ResourceDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Resource definition "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: ResourceDefinitionId): ResourceDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: ResourceDefinitionId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly ResourceDefinition[] {
    return [...this.#definitions.values()];
  }

  getByFamily(family: ResourceFamily): readonly ResourceDefinition[] {
    return [...this.#definitions.values()].filter((d) => d.family === family);
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
