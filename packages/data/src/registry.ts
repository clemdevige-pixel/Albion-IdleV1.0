import type { DataId } from "./data-id.js";

/**
 * Immutable, Map-backed registry providing O(1) lookup by DataId.
 * Records are stored in sorted-by-id order for determinism.
 */
export class DataRegistry<TRecord, TCategory extends string = string> {
  private readonly _map: ReadonlyMap<string, TRecord>;
  private readonly _sorted: readonly TRecord[];
  private readonly _ids: readonly DataId<TCategory>[];

  /** Use {@link DataRegistryBuilder} to construct. */
  constructor(entries: ReadonlyMap<string, TRecord>) {
    this._map = entries;
    const sortedKeys = [...entries.keys()].sort();
    this._ids = sortedKeys as DataId<TCategory>[];
    this._sorted = sortedKeys.map((k) => entries.get(k)!);
  }

  /** Get a record by id. Throws if not found. */
  get(id: DataId<TCategory>): TRecord {
    const record = this._map.get(id);
    if (record === undefined) {
      throw new Error(`Unknown data ID: "${id}"`);
    }
    return record;
  }

  /** Get a record by id, or undefined if not found. */
  tryGet(id: DataId<TCategory>): TRecord | undefined {
    return this._map.get(id);
  }

  /** Check if an id exists in the registry. */
  has(id: DataId<TCategory>): boolean {
    return this._map.has(id);
  }

  /** All records in stable sorted order by id. */
  getAll(): readonly TRecord[] {
    return this._sorted;
  }

  /** All ids in stable sorted order. */
  getIds(): readonly DataId<TCategory>[] {
    return this._ids;
  }

  /** Number of records. */
  getCount(): number {
    return this._map.size;
  }
}
