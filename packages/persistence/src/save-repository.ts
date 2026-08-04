import type { SaveFormat } from "./save-format.js";
import { SaveNotFoundError } from "./errors.js";

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
