import type { EntityId } from "../entity/entity-id.js";
import type { ComponentStore } from "../component/component-store.js";
import type { ComponentOf, ComponentType } from "../component/component-type.js";

/** A non-empty tuple of component types to match. */
export type ComponentTuple = readonly [ComponentType<unknown>, ...ComponentType<unknown>[]];

/** Maps a tuple of component types to a tuple of their data types. */
export type QueryComponents<T extends ComponentTuple> = {
  -readonly [K in keyof T]: ComponentOf<T[K]>;
};

/** One matched entity together with the requested components, in order. */
export interface QueryResult<T extends ComponentTuple> {
  readonly entityId: EntityId;
  readonly components: QueryComponents<T>;
}

/**
 * Runs a conjunctive query: entities that have *all* of `types`.
 *
 * Results are a freshly materialised array (a snapshot), so a caller may mutate
 * the world while iterating them safely. Order is stable: ascending entity id,
 * i.e. creation order.
 *
 * For efficiency the smallest matching component set drives the scan instead of
 * every entity.
 */
export function runQuery<T extends ComponentTuple>(
  store: ComponentStore,
  types: T,
): QueryResult<T>[] {
  const smallestKey = pickSmallestKey(store, types);
  const matched: EntityId[] = [];

  for (const entityId of store.entitiesFor(smallestKey)) {
    if (types.every((type) => store.has(entityId, type))) {
      matched.push(entityId);
    }
  }

  matched.sort((a, b) => a - b);

  return matched.map((entityId) => ({
    entityId,
    // Every id in `matched` has all `types`; assembling the typed tuple.
    components: types.map((type) => store.get(entityId, type)) as QueryComponents<T>,
  }));
}

function pickSmallestKey(store: ComponentStore, types: ComponentTuple): string {
  let smallestKey = types[0].key;
  let smallestCount = store.countFor(smallestKey);
  for (let i = 1; i < types.length; i += 1) {
    const key = types[i]!.key;
    const count = store.countFor(key);
    if (count < smallestCount) {
      smallestCount = count;
      smallestKey = key;
    }
  }
  return smallestKey;
}
