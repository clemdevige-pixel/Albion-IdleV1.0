import type {
  GatheringToolDefinition,
  GatheringToolId,
  GatheringToolType,
} from "./gathering-tool-types.js";

/**
 * Stores gathering tool definitions. Pure data container — no side effects.
 */
export class GatheringToolRegistry {
  readonly #definitions = new Map<GatheringToolId, GatheringToolDefinition>();

  register(definition: GatheringToolDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Gathering tool "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: GatheringToolId): GatheringToolDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: GatheringToolId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly GatheringToolDefinition[] {
    return [...this.#definitions.values()];
  }

  getByType(toolType: GatheringToolType): readonly GatheringToolDefinition[] {
    return [...this.#definitions.values()].filter((d) => d.toolType === toolType);
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
