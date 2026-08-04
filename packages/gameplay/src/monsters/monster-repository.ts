import type { MonsterDefinition, MonsterDefinitionId, MonsterResult } from "./types.js";

/**
 * Stores and retrieves monster definitions (data templates).
 * Definitions are registered once and used by MonsterFactory to create instances.
 */
export class MonsterRepository {
  readonly #definitions = new Map<MonsterDefinitionId, MonsterDefinition>();

  register(definition: MonsterDefinition): void {
    this.#definitions.set(definition.id, definition);
  }

  get(id: MonsterDefinitionId): MonsterResult<MonsterDefinition> {
    const def = this.#definitions.get(id);
    if (def === undefined) {
      return { ok: false, reason: "definition_not_found" };
    }
    return { ok: true, value: def };
  }

  has(id: MonsterDefinitionId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly MonsterDefinition[] {
    return [...this.#definitions.values()];
  }

  count(): number {
    return this.#definitions.size;
  }
}
