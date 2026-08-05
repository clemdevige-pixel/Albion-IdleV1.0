import type { SaveFormat } from "./save-format.js";
import { SaveNotFoundError } from "./errors.js";

/**
 * SaveRepository implementation using browser localStorage.
 * 
 * Storage key format: "albion_idle_save_{id}"
 * 
 * Errors:
 * - Throws SaveNotFoundError on get() or delete() if save doesn't exist
 * - Silently handles localStorage quota exceeded, JSON parse errors
 * - Logs errors to console for debugging
 */
export class LocalStorageSaveRepository implements SaveRepository {
  private readonly keyPrefix = "albion_idle_save_";

  private formatKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  private parseSaveFormat(json: string): SaveFormat | null {
    try {
      return JSON.parse(json) as SaveFormat;
    } catch (err) {
      console.error(
        "[LocalStorageSaveRepository] Failed to parse save format",
        err,
      );
      return null;
    }
  }

  list(): string[] {
    try {
      const ids: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.keyPrefix)) {
          const id = key.substring(this.keyPrefix.length);
          ids.push(id);
        }
      }
      return ids;
    } catch (err) {
      console.error("[LocalStorageSaveRepository] Failed to list saves", err);
      return [];
    }
  }

  get(id: string): SaveFormat {
    try {
      const key = this.formatKey(id);
      const json = localStorage.getItem(key);

      if (json === null) {
        throw new SaveNotFoundError(id);
      }

      const data = this.parseSaveFormat(json);
      if (data === null) {
        throw new SaveNotFoundError(id);
      }

      return data;
    } catch (err) {
      if (err instanceof SaveNotFoundError) {
        throw err;
      }
      console.error("[LocalStorageSaveRepository] Failed to get save", id, err);
      throw new SaveNotFoundError(id);
    }
  }

  save(id: string, data: SaveFormat): void {
    try {
      const key = this.formatKey(id);
      const json = JSON.stringify(data);
      localStorage.setItem(key, json);
    } catch (err) {
      console.error(
        "[LocalStorageSaveRepository] Failed to save",
        id,
        "Error:",
        err instanceof Error ? err.message : String(err),
      );
      // Fail silently - don't throw, let game continue
    }
  }

  delete(id: string): void {
    try {
      const key = this.formatKey(id);
      if (!localStorage.getItem(key)) {
        throw new SaveNotFoundError(id);
      }
      localStorage.removeItem(key);
    } catch (err) {
      if (err instanceof SaveNotFoundError) {
        throw err;
      }
      console.error(
        "[LocalStorageSaveRepository] Failed to delete save",
        id,
        err,
      );
      throw new SaveNotFoundError(id);
    }
  }

  has(id: string): boolean {
    try {
      const key = this.formatKey(id);
      return localStorage.getItem(key) !== null;
    } catch (err) {
      console.error(
        "[LocalStorageSaveRepository] Failed to check save existence",
        id,
        err,
      );
      return false;
    }
  }
}
