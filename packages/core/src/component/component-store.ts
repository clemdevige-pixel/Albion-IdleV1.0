import type { EntityId } from "../entity/entity-id.js";
import { ComponentAlreadyExistsError, ComponentNotFoundError } from "../entity/errors.js";
import type { ComponentType } from "./component-type.js";

/**
 * Sparse component storage indexed by `ComponentType.key → (EntityId → data)`.
 *
 * This layout gives O(1) access by (entity, component) and lets queries iterate
 * the smallest matching set. Internal maps are never handed out mutably.
 *
 * The store validates *component* invariants (already-present / absent). Entity
 * existence is validated by the {@link World}, which owns that concern.
 */
export class ComponentStore {
  readonly #byKey = new Map<string, Map<EntityId, unknown>>();

  /** Adds a component; throws if the entity already has it. */
  add<T>(entityId: EntityId, type: ComponentType<T>, component: T): void {
    const map = this.#mapFor(type.key);
    if (map.has(entityId)) {
      throw new ComponentAlreadyExistsError(entityId, type.key);
    }
    map.set(entityId, component);
  }

  /** Adds or replaces a component. */
  set<T>(entityId: EntityId, type: ComponentType<T>, component: T): void {
    this.#mapFor(type.key).set(entityId, component);
  }

  has<T>(entityId: EntityId, type: ComponentType<T>): boolean {
    return this.#byKey.get(type.key)?.has(entityId) ?? false;
  }

  /** Reads a component; throws {@link ComponentNotFoundError} if absent. */
  get<T>(entityId: EntityId, type: ComponentType<T>): T {
    const map = this.#byKey.get(type.key);
    if (map === undefined || !map.has(entityId)) {
      throw new ComponentNotFoundError(entityId, type.key);
    }
    // Values under `type.key` are always of type `T` by construction.
    return map.get(entityId) as T;
  }

  /** Reads a component or returns `undefined` if absent. */
  tryGet<T>(entityId: EntityId, type: ComponentType<T>): T | undefined {
    const map = this.#byKey.get(type.key);
    if (map === undefined || !map.has(entityId)) {
      return undefined;
    }
    return map.get(entityId) as T;
  }

  /** Removes a component; throws {@link ComponentNotFoundError} if absent. */
  remove<T>(entityId: EntityId, type: ComponentType<T>): void {
    const map = this.#byKey.get(type.key);
    if (map === undefined || !map.delete(entityId)) {
      throw new ComponentNotFoundError(entityId, type.key);
    }
  }

  /** Removes every component attached to `entityId` (used on destruction). */
  removeAllForEntity(entityId: EntityId): void {
    for (const map of this.#byKey.values()) {
      map.delete(entityId);
    }
  }

  /** Number of entities carrying the given component type. */
  countFor(key: string): number {
    return this.#byKey.get(key)?.size ?? 0;
  }

  /** Entity ids carrying the given component type (read-only iteration). */
  entitiesFor(key: string): IterableIterator<EntityId> {
    return (this.#byKey.get(key) ?? EMPTY).keys();
  }

  /** All component keys currently present in the store. */
  keys(): IterableIterator<string> {
    return this.#byKey.keys();
  }

  /** Drops all stored components. */
  clear(): void {
    this.#byKey.clear();
  }

  #mapFor(key: string): Map<EntityId, unknown> {
    let map = this.#byKey.get(key);
    if (map === undefined) {
      map = new Map<EntityId, unknown>();
      this.#byKey.set(key, map);
    }
    return map;
  }
}

const EMPTY: ReadonlyMap<EntityId, unknown> = new Map<EntityId, unknown>();
