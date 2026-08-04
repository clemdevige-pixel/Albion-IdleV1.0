import type { EventBus } from "@game/core";
import type { MonsterFamilyEventMap } from "./monster-family-events.js";
import type {
  MonsterFamilyDefinition,
  MonsterFamilyId,
  MonsterFamilyResult,
} from "./types.js";

/**
 * Stores and retrieves monster family definitions.
 * Emits events on registration/unregistration.
 */
export class MonsterFamilyRegistry {
  readonly #families = new Map<MonsterFamilyId, MonsterFamilyDefinition>();
  readonly #eventBus: EventBus<MonsterFamilyEventMap>;

  constructor(eventBus: EventBus<MonsterFamilyEventMap>) {
    this.#eventBus = eventBus;
  }

  register(definition: MonsterFamilyDefinition): MonsterFamilyResult<void> {
    if (this.#families.has(definition.id)) {
      return { ok: false, reason: "family_already_registered" };
    }
    if (definition.name === "" || definition.faction === "") {
      return { ok: false, reason: "invalid_family_definition" };
    }

    this.#families.set(definition.id, definition);
    this.#eventBus.publish("monsterFamilyRegistered", {
      familyId: definition.id,
      name: definition.name,
      faction: definition.faction,
    });
    return { ok: true, value: undefined };
  }

  unregister(id: MonsterFamilyId): MonsterFamilyResult<void> {
    if (!this.#families.has(id)) {
      return { ok: false, reason: "family_not_found" };
    }
    this.#families.delete(id);
    this.#eventBus.publish("monsterFamilyUnregistered", { familyId: id });
    return { ok: true, value: undefined };
  }

  get(id: MonsterFamilyId): MonsterFamilyResult<MonsterFamilyDefinition> {
    const family = this.#families.get(id);
    if (family === undefined) {
      return { ok: false, reason: "family_not_found" };
    }
    return { ok: true, value: family };
  }

  has(id: MonsterFamilyId): boolean {
    return this.#families.has(id);
  }

  getAll(): readonly MonsterFamilyDefinition[] {
    return [...this.#families.values()];
  }

  getByFaction(faction: string): readonly MonsterFamilyDefinition[] {
    return [...this.#families.values()].filter((f) => f.faction === faction);
  }

  count(): number {
    return this.#families.size;
  }
}
