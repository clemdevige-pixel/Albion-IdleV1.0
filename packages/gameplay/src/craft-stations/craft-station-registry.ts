import type {
  CraftStationDefinition,
  CraftStationId,
  CraftStationType,
} from "./craft-station-types.js";

/**
 * Stores craft-station definitions. Pure data container — no side effects.
 */
export class CraftStationRegistry {
  readonly #definitions = new Map<CraftStationId, CraftStationDefinition>();

  register(definition: CraftStationDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(
        `Craft station "${definition.id}" is already registered`,
      );
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: CraftStationId): CraftStationDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: CraftStationId): boolean {
    return this.#definitions.has(id);
  }

  getByType(type: CraftStationType): readonly CraftStationDefinition[] {
    return [...this.#definitions.values()].filter((d) => d.type === type);
  }

  getAll(): readonly CraftStationDefinition[] {
    return [...this.#definitions.values()];
  }

  get size(): number {
    return this.#definitions.size;
  }

  clear(): void {
    this.#definitions.clear();
  }
}
