import type { ResourceNodeDefinition, ResourceNodeDefinitionId } from "./resource-node-types.js";

/**
 * Stores resource node definitions. Pure data container — no side effects.
 */
export class ResourceNodeRegistry {
  readonly #definitions = new Map<ResourceNodeDefinitionId, ResourceNodeDefinition>();

  register(definition: ResourceNodeDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Resource node definition "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: ResourceNodeDefinitionId): ResourceNodeDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: ResourceNodeDefinitionId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly ResourceNodeDefinition[] {
    return [...this.#definitions.values()];
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
