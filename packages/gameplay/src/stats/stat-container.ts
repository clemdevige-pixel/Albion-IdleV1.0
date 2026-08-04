import { calculateStat } from "./stat-calculator.js";
import type { StatRegistry } from "./stat-registry.js";
import type { ModifierId, StatId, StatModifier, StatValue } from "./types.js";

export class StatContainer {
  readonly #registry: StatRegistry;
  readonly #bases = new Map<StatId, number>();
  readonly #computed = new Map<StatId, number>();
  readonly #modifiers = new Map<ModifierId, StatModifier>();

  constructor(registry: StatRegistry) {
    this.#registry = registry;
    for (const def of registry.getAll()) {
      this.#bases.set(def.id, def.defaultBase);
      this.#computed.set(def.id, def.defaultBase);
    }
  }

  getBase(statId: StatId): number {
    const value = this.#bases.get(statId);
    if (value === undefined) {
      throw new Error(`Stat "${statId}" not found`);
    }
    return value;
  }

  setBase(statId: StatId, value: number): void {
    if (!this.#bases.has(statId)) {
      throw new Error(`Stat "${statId}" not found`);
    }
    this.#bases.set(statId, value);
    this.recalculate(statId);
  }

  getComputed(statId: StatId): number {
    const value = this.#computed.get(statId);
    if (value === undefined) {
      throw new Error(`Stat "${statId}" not found`);
    }
    return value;
  }

  getStat(statId: StatId): StatValue {
    return { base: this.getBase(statId), computed: this.getComputed(statId) };
  }

  addModifier(modifier: StatModifier): void {
    if (this.#modifiers.has(modifier.id)) {
      throw new Error(`Modifier "${modifier.id}" already exists`);
    }
    this.#modifiers.set(modifier.id, modifier);
    this.recalculate(modifier.statId);
  }

  removeModifier(modifierId: ModifierId): boolean {
    const modifier = this.#modifiers.get(modifierId);
    if (modifier === undefined) {
      return false;
    }
    this.#modifiers.delete(modifierId);
    this.recalculate(modifier.statId);
    return true;
  }

  getModifiers(statId?: StatId): readonly StatModifier[] {
    const all = [...this.#modifiers.values()];
    if (statId === undefined) {
      return all;
    }
    return all.filter((m) => m.statId === statId);
  }

  hasModifier(modifierId: ModifierId): boolean {
    return this.#modifiers.has(modifierId);
  }

  clearModifiers(statId?: StatId): void {
    if (statId === undefined) {
      this.#modifiers.clear();
      this.recalculate();
      return;
    }
    for (const [id, mod] of this.#modifiers) {
      if (mod.statId === statId) {
        this.#modifiers.delete(id);
      }
    }
    this.recalculate(statId);
  }

  recalculate(statId?: StatId): void {
    if (statId !== undefined) {
      this.#recalculateOne(statId);
      return;
    }
    for (const id of this.#bases.keys()) {
      this.#recalculateOne(id);
    }
  }

  getAllStats(): ReadonlyMap<StatId, StatValue> {
    const result = new Map<StatId, StatValue>();
    for (const id of this.#bases.keys()) {
      result.set(id, this.getStat(id));
    }
    return result;
  }

  #recalculateOne(statId: StatId): void {
    const def = this.#registry.get(statId);
    if (def === undefined) {
      return;
    }
    const base = this.#bases.get(statId) ?? def.defaultBase;
    const mods = this.getModifiers(statId);
    this.#computed.set(statId, calculateStat(base, mods, def));
  }
}
