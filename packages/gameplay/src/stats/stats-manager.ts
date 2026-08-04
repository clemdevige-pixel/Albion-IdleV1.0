import type { EntityId, World } from "@game/core";
import { StatsComponent } from "./components.js";
import { StatContainer } from "./stat-container.js";
import type { StatRegistry } from "./stat-registry.js";
import type { ModifierId, StatId, StatModifier, StatValue } from "./types.js";

export class StatsManager {
  readonly #world: World;
  readonly #registry: StatRegistry;

  constructor(world: World, registry: StatRegistry) {
    this.#world = world;
    this.#registry = registry;
  }

  attachStats(entityId: EntityId): StatContainer {
    const container = new StatContainer(this.#registry);
    this.#world.addComponent(entityId, StatsComponent, container);
    return container;
  }

  detachStats(entityId: EntityId): void {
    this.#world.removeComponent(entityId, StatsComponent);
  }

  hasStats(entityId: EntityId): boolean {
    return this.#world.hasComponent(entityId, StatsComponent);
  }

  getStat(entityId: EntityId, statId: StatId): StatValue {
    return this.#getContainer(entityId).getStat(statId);
  }

  setBaseStat(entityId: EntityId, statId: StatId, value: number): void {
    this.#getContainer(entityId).setBase(statId, value);
  }

  addModifier(entityId: EntityId, modifier: StatModifier): void {
    this.#getContainer(entityId).addModifier(modifier);
  }

  removeModifier(entityId: EntityId, modifierId: ModifierId): boolean {
    return this.#getContainer(entityId).removeModifier(modifierId);
  }

  getModifiers(entityId: EntityId, statId?: StatId): readonly StatModifier[] {
    return this.#getContainer(entityId).getModifiers(statId);
  }

  calculateStats(entityId: EntityId): void {
    this.#getContainer(entityId).recalculate();
  }

  #getContainer(entityId: EntityId): StatContainer {
    return this.#world.getComponent(entityId, StatsComponent);
  }
}
