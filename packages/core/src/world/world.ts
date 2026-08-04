import type { RuntimeServices } from "../runtime/service-container.js";
import { EntityRegistry } from "../entity/entity-registry.js";
import type { EntityId } from "../entity/entity-id.js";
import { EntityNotFoundError } from "../entity/errors.js";
import { ComponentStore } from "../component/component-store.js";
import type { ComponentType } from "../component/component-type.js";
import { runQuery, type ComponentTuple, type QueryResult } from "../query/query.js";
import { SystemRegistry } from "../system/system-registry.js";
import type { SimulationSystem, SystemContext, SystemId } from "../system/system.js";

/** A deterministic snapshot of a single entity's components (keys sorted). */
export interface EntitySnapshot {
  readonly entityId: EntityId;
  readonly components: ReadonlyArray<readonly [key: string, value: unknown]>;
}

/**
 * The simulation world: the single owner of entities, components and systems.
 *
 * The world holds *state and execution*; it does not own time or scheduling —
 * those stay with the Runtime Core, which it reads through {@link RuntimeServices}.
 * It never starts a loop on its own; `update()` is driven externally (see
 * `connectWorldToLoop`). Mutations take effect immediately; queries return fresh
 * snapshot arrays, so mutating during iteration of results is safe.
 */
export class World {
  readonly #services: RuntimeServices;
  readonly #entities = new EntityRegistry();
  readonly #components = new ComponentStore();
  readonly #systems = new SystemRegistry();

  constructor(services: RuntimeServices) {
    this.#services = services;
  }

  get services(): RuntimeServices {
    return this.#services;
  }

  // --- Entity lifecycle ---------------------------------------------------

  createEntity(): EntityId {
    return this.#entities.create();
  }

  /** Destroys an entity and all its components. Throws if it does not exist. */
  destroyEntity(entityId: EntityId): void {
    if (!this.#entities.destroy(entityId)) {
      throw new EntityNotFoundError(entityId);
    }
    this.#components.removeAllForEntity(entityId);
  }

  hasEntity(entityId: EntityId): boolean {
    return this.#entities.has(entityId);
  }

  getEntityCount(): number {
    return this.#entities.count;
  }

  // --- Components ---------------------------------------------------------

  /** Adds a component; fails if the entity is unknown or already has it. */
  addComponent<T>(entityId: EntityId, type: ComponentType<T>, component: T): void {
    this.#requireEntity(entityId);
    this.#components.add(entityId, type, component);
  }

  /** Adds or replaces a component; fails if the entity is unknown. */
  setComponent<T>(entityId: EntityId, type: ComponentType<T>, component: T): void {
    this.#requireEntity(entityId);
    this.#components.set(entityId, type, component);
  }

  hasComponent<T>(entityId: EntityId, type: ComponentType<T>): boolean {
    return this.#entities.has(entityId) && this.#components.has(entityId, type);
  }

  /** Reads a component; fails if the entity is unknown or lacks the component. */
  getComponent<T>(entityId: EntityId, type: ComponentType<T>): T {
    this.#requireEntity(entityId);
    return this.#components.get(entityId, type);
  }

  /** Reads a component, or `undefined` if the entity or component is absent. */
  tryGetComponent<T>(entityId: EntityId, type: ComponentType<T>): T | undefined {
    if (!this.#entities.has(entityId)) {
      return undefined;
    }
    return this.#components.tryGet(entityId, type);
  }

  /** Removes a component; fails if the entity is unknown or lacks the component. */
  removeComponent<T>(entityId: EntityId, type: ComponentType<T>): void {
    this.#requireEntity(entityId);
    this.#components.remove(entityId, type);
  }

  // --- Queries ------------------------------------------------------------

  /** All entities that have every one of `types`, in stable id order. */
  query<T extends ComponentTuple>(...types: T): QueryResult<T>[] {
    return runQuery(this.#components, types);
  }

  // --- Systems ------------------------------------------------------------

  registerSystem(system: SimulationSystem): void {
    this.#systems.register(system);
  }

  unregisterSystem(id: SystemId): void {
    this.#systems.unregister(id);
  }

  hasSystem(id: SystemId): boolean {
    return this.#systems.has(id);
  }

  /** Runs all systems once, in deterministic order, for the current tick. */
  update(): void {
    const context: SystemContext = {
      world: this,
      tick: this.#services.clock.currentTick,
      deltaTime: this.#services.clock.deltaTime,
      services: this.#services,
    };
    this.#systems.execute(context);
  }

  // --- Introspection ------------------------------------------------------

  /** Deterministic, comparable snapshot of all entities and their components. */
  snapshot(): EntitySnapshot[] {
    const keys = [...this.#components.keys()].sort();
    const result: EntitySnapshot[] = [];
    for (const entityId of [...this.#entities.ids()].sort((a, b) => a - b)) {
      const components: Array<readonly [string, unknown]> = [];
      for (const key of keys) {
        const type = { key };
        if (this.#components.has(entityId, type)) {
          components.push([key, this.#components.get(entityId, type)]);
        }
      }
      result.push({ entityId, components });
    }
    return result;
  }

  /** Removes all entities, components and systems. */
  clear(): void {
    this.#entities.clear();
    this.#components.clear();
    this.#systems.clear();
  }

  #requireEntity(entityId: EntityId): void {
    if (!this.#entities.has(entityId)) {
      throw new EntityNotFoundError(entityId);
    }
  }
}
