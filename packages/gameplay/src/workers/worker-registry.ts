import type {
  WorkerDefinition,
  WorkerDefinitionId,
  WorkerProfession,
} from "./worker-types.js";

/**
 * Stores worker definitions. Pure data container — no side effects.
 */
export class WorkerRegistry {
  readonly #definitions = new Map<WorkerDefinitionId, WorkerDefinition>();

  register(definition: WorkerDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(
        `Worker definition "${definition.id}" is already registered`,
      );
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: WorkerDefinitionId): WorkerDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: WorkerDefinitionId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly WorkerDefinition[] {
    return [...this.#definitions.values()];
  }

  getByProfession(profession: WorkerProfession): readonly WorkerDefinition[] {
    return [...this.#definitions.values()].filter(
      (d) => d.profession === profession,
    );
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
