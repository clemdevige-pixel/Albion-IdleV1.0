import type { SaveFormat } from "./save-format.js";
import {
  SaveNotFoundError,
  PersistenceError,
  InvalidSaveError,
  SerializationFailedError,
} from "./errors.js";

export interface SaveRepository {
  list(): string[];
  get(id: string): SaveFormat;
  save(id: string, data: SaveFormat): void;
  delete(id: string): void;
  has(id: string): boolean;
}

export class InMemorySaveRepository implements SaveRepository {
  private readonly store = new Map<string, SaveFormat>();

  list(): string[] {
    return [...this.store.keys()];
  }

  get(id: string): SaveFormat {
    const data = this.store.get(id);
    if (data === undefined) throw new SaveNotFoundError(id);
    return data;
  }

  save(id: string, data: SaveFormat): void {
    this.store.set(id, data);
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new SaveNotFoundError(id);
    this.store.delete(id);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }
}

export interface LocalStorageSaveRepositoryOptions {
  storage?: Storage | undefined;
  keyPrefix?: string | undefined;
}

export class LocalStorageSaveRepository implements SaveRepository {
  private readonly storage: Storage;
  private readonly keyPrefix: string;

  constructor(options?: LocalStorageSaveRepositoryOptions) {
    const s = options?.storage ?? (typeof globalThis !== "undefined" && "localStorage" in globalThis ? globalThis.localStorage : undefined);
    if (!s) {
      throw new PersistenceError("LocalStorage is not available in the current environment");
    }
    this.storage = s;
    this.keyPrefix = options?.keyPrefix ?? "albion_idle_save_";
  }

  private getKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  list(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key !== null && key.startsWith(this.keyPrefix)) {
        keys.push(key.slice(this.keyPrefix.length));
      }
    }
    return keys;
  }

  get(id: string): SaveFormat {
    const key = this.getKey(id);
    const raw = this.storage.getItem(key);
    if (raw === null) {
      throw new SaveNotFoundError(id);
    }
    try {
      return JSON.parse(raw) as SaveFormat;
    } catch (cause) {
      throw new InvalidSaveError(`Failed to parse save data for '${id}': invalid JSON format`, { cause });
    }
  }

  save(id: string, data: SaveFormat): void {
    const key = this.getKey(id);
    try {
      const serialized = JSON.stringify(data);
      this.storage.setItem(key, serialized);
    } catch (cause) {
      throw new SerializationFailedError(`Failed to persist save '${id}' to LocalStorage`, { cause });
    }
  }

  delete(id: string): void {
    const key = this.getKey(id);
    if (this.storage.getItem(key) === null) {
      throw new SaveNotFoundError(id);
    }
    try {
      this.storage.removeItem(key);
    } catch (cause) {
      throw new PersistenceError(`Failed to delete save '${id}' from LocalStorage`, { cause });
    }
  }

  has(id: string): boolean {
    const key = this.getKey(id);
    return this.storage.getItem(key) !== null;
  }
}

