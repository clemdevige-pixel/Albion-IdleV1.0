import { describe, it, expect } from "vitest";
import { InMemorySaveRepository, LocalStorageSaveRepository } from "../save-repository.js";
import { SaveNotFoundError, InvalidSaveError, SerializationFailedError, PersistenceError } from "../errors.js";
import { computeChecksum } from "../serializer.js";
import type { SaveFormat } from "../save-format.js";

function makeSave(): SaveFormat {
  const payload = { data: 1 };
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 0,
      updatedAt: 0,
      buildVersion: "0.1.0",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
  };
}

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("InMemorySaveRepository", () => {
  it("stores and retrieves saves", () => {
    const repo = new InMemorySaveRepository();
    const save = makeSave();
    repo.save("s1", save);
    expect(repo.get("s1")).toBe(save);
  });

  it("lists save ids", () => {
    const repo = new InMemorySaveRepository();
    repo.save("a", makeSave());
    repo.save("b", makeSave());
    expect(repo.list()).toEqual(["a", "b"]);
  });

  it("checks existence", () => {
    const repo = new InMemorySaveRepository();
    expect(repo.has("x")).toBe(false);
    repo.save("x", makeSave());
    expect(repo.has("x")).toBe(true);
  });

  it("deletes saves", () => {
    const repo = new InMemorySaveRepository();
    repo.save("d", makeSave());
    repo.delete("d");
    expect(repo.has("d")).toBe(false);
  });

  it("throws on get missing", () => {
    const repo = new InMemorySaveRepository();
    expect(() => repo.get("nope")).toThrow(SaveNotFoundError);
  });

  it("throws on delete missing", () => {
    const repo = new InMemorySaveRepository();
    expect(() => repo.delete("nope")).toThrow(SaveNotFoundError);
  });
});

describe("LocalStorageSaveRepository", () => {
  it("throws error if storage is unavailable", () => {
    expect(() => new LocalStorageSaveRepository({ storage: undefined })).toThrow(PersistenceError);
  });

  it("stores and retrieves saves via Storage", () => {
    const storage = new MockStorage();
    const repo = new LocalStorageSaveRepository({ storage, keyPrefix: "test_save_" });
    const save = makeSave();

    repo.save("slot1", save);
    expect(repo.has("slot1")).toBe(true);
    expect(repo.get("slot1")).toEqual(save);
  });

  it("lists save ids matching key prefix", () => {
    const storage = new MockStorage();
    const repo = new LocalStorageSaveRepository({ storage, keyPrefix: "test_save_" });
    storage.setItem("other_key", "value");
    repo.save("slotA", makeSave());
    repo.save("slotB", makeSave());

    expect(repo.list()).toEqual(["slotA", "slotB"]);
  });

  it("deletes saves", () => {
    const storage = new MockStorage();
    const repo = new LocalStorageSaveRepository({ storage, keyPrefix: "test_save_" });
    repo.save("slotD", makeSave());
    expect(repo.has("slotD")).toBe(true);

    repo.delete("slotD");
    expect(repo.has("slotD")).toBe(false);
    expect(() => repo.get("slotD")).toThrow(SaveNotFoundError);
  });

  it("throws SaveNotFoundError for non-existent save", () => {
    const storage = new MockStorage();
    const repo = new LocalStorageSaveRepository({ storage });
    expect(() => repo.get("non_existent")).toThrow(SaveNotFoundError);
    expect(() => repo.delete("non_existent")).toThrow(SaveNotFoundError);
  });

  it("throws InvalidSaveError when storage content is invalid JSON", () => {
    const storage = new MockStorage();
    const repo = new LocalStorageSaveRepository({ storage, keyPrefix: "test_save_" });
    storage.setItem("test_save_bad", "corrupted json payload {{");

    expect(() => repo.get("bad")).toThrow(InvalidSaveError);
  });

  it("throws SerializationFailedError when setItem fails", () => {
    const storage = new MockStorage();
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const repo = new LocalStorageSaveRepository({ storage });
    expect(() => repo.save("slot1", makeSave())).toThrow(SerializationFailedError);
  });
});

