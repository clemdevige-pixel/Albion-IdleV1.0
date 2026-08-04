import { createEntityIdFactory, type EntityId } from "./entity-id.js";
import type { IdFactory } from "../runtime/ids.js";

/**
 * Owns entity existence and id allocation.
 *
 * Tracks only *which* entities exist and in what creation order. It deliberately
 * knows nothing about components — the {@link World} coordinates component
 * cleanup on destruction. A `Set` preserves insertion (creation) order, which
 * gives queries their stable, deterministic iteration order.
 */
export class EntityRegistry {
  readonly #alive = new Set<EntityId>();
  readonly #ids: IdFactory<EntityId>;

  constructor(ids: IdFactory<EntityId> = createEntityIdFactory()) {
    this.#ids = ids;
  }

  /** Allocates a new, unique entity id and marks it alive. */
  create(): EntityId {
    const id = this.#ids.next();
    this.#alive.add(id);
    return id;
  }

  /** Marks an entity as destroyed. Returns `true` if it was alive. */
  destroy(id: EntityId): boolean {
    return this.#alive.delete(id);
  }

  has(id: EntityId): boolean {
    return this.#alive.has(id);
  }

  get count(): number {
    return this.#alive.size;
  }

  /** Alive entity ids in creation order. */
  ids(): IterableIterator<EntityId> {
    return this.#alive.values();
  }

  /** Removes all entities and resets id allocation. */
  clear(): void {
    this.#alive.clear();
    this.#ids.reset();
  }
}
