import type { ZoneDefinition, ZoneDefinitionId } from "./zone-types.js";

/**
 * Stores zone definitions. Pure data container — no side effects.
 */
export class ZoneRegistry {
  readonly #definitions = new Map<ZoneDefinitionId, ZoneDefinition>();

  register(definition: ZoneDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Zone definition "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: ZoneDefinitionId): ZoneDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: ZoneDefinitionId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly ZoneDefinition[] {
    return [...this.#definitions.values()];
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
