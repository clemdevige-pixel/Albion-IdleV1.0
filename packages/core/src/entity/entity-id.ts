import { createMonotonicIdFactory, type Brand, type IdFactory } from "../runtime/ids.js";

/**
 * Strongly-typed, opaque entity identifier.
 *
 * Backed by a monotonic counter (reusing the Phase 02.1 id strategy), so ids are
 * deterministic, comparable, stable for the entity's lifetime, and serialisable.
 */
export type EntityId = Brand<number, "EntityId">;

/** Creates a fresh entity id factory. */
export function createEntityIdFactory(): IdFactory<EntityId> {
  return createMonotonicIdFactory<EntityId>();
}
