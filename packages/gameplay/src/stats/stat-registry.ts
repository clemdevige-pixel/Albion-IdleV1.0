import type { StatDefinition, StatId } from "./types.js";

export class StatRegistry {
  readonly #definitions = new Map<StatId, StatDefinition>();

  register(definition: StatDefinition): void {
    if (this.#definitions.has(definition.id)) {
      throw new Error(`Stat "${definition.id}" is already registered`);
    }
    this.#definitions.set(definition.id, definition);
  }

  get(id: StatId): StatDefinition | undefined {
    return this.#definitions.get(id);
  }

  has(id: StatId): boolean {
    return this.#definitions.has(id);
  }

  getAll(): readonly StatDefinition[] {
    return [...this.#definitions.values()];
  }
}

const DEFAULT_STATS: readonly StatDefinition[] = [
  { id: "stat_max_health" as StatId, min: 1, max: Infinity, defaultBase: 100 },
  { id: "stat_max_energy" as StatId, min: 0, max: Infinity, defaultBase: 50 },
  { id: "stat_physical_damage" as StatId, min: 0, max: Infinity, defaultBase: 0 },
  { id: "stat_magical_damage" as StatId, min: 0, max: Infinity, defaultBase: 0 },
  { id: "stat_armor" as StatId, min: 0, max: Infinity, defaultBase: 0 },
  { id: "stat_magic_resistance" as StatId, min: 0, max: Infinity, defaultBase: 0 },
  { id: "stat_attack_speed" as StatId, min: 0.1, max: 5.0, defaultBase: 1.0 },
  { id: "stat_move_speed" as StatId, min: 0.1, max: Infinity, defaultBase: 1.0 },
];

export function createDefaultStatRegistry(): StatRegistry {
  const registry = new StatRegistry();
  for (const stat of DEFAULT_STATS) {
    registry.register(stat);
  }
  return registry;
}
