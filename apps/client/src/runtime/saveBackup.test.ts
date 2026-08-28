import { describe, expect, it, vi } from "vitest";
import {
  InMemorySaveRepository,
  LocalStorageSaveRepository,
  SerializationFailedError,
  type SaveFormat,
} from "@game/persistence";
import { backupCurrentSave, loadSaveWithBackup } from "./saveBackup";

function makeSave(updatedAt: number, padding = ""): SaveFormat {
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 0,
      updatedAt,
      buildVersion: "test",
      seed: 42,
    },
    payload: { updatedAt, padding },
    checksum: `checksum-${String(updatedAt)}`,
  };
}

class QuotaStorage implements Storage {
  private readonly values = new Map<string, string>();
  public quota = Number.POSITIVE_INFINITY;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    const next = new Map(this.values);
    next.set(key, value);
    const size = [...next.entries()].reduce(
      (total, [storedKey, storedValue]) => total + storedKey.length + storedValue.length,
      0,
    );
    if (size > this.quota) {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    this.values.set(key, value);
  }

  get used(): number {
    return [...this.values.entries()].reduce(
      (total, [key, value]) => total + key.length + value.length,
      0,
    );
  }
}

class RestoreFailingRepository extends InMemorySaveRepository {
  public failPrimaryWrites = false;

  override save(id: string, data: SaveFormat): void {
    if (this.failPrimaryWrites && id === "primary") {
      throw new SerializationFailedError("quota exceeded");
    }
    super.save(id, data);
  }
}

class FirstRestoreFailingRepository extends InMemorySaveRepository {
  public failNextPrimaryWrite = false;

  override save(id: string, data: SaveFormat): void {
    if (this.failNextPrimaryWrite && id === "primary") {
      this.failNextPrimaryWrite = false;
      throw new SerializationFailedError("quota exceeded");
    }
    super.save(id, data);
  }
}

describe("save backup", () => {
  it("copies the current primary snapshot before overwrite", () => {
    const repository = new InMemorySaveRepository();
    const primary = makeSave(10);
    repository.save("primary", primary);

    expect(backupCurrentSave(repository, "primary", "backup")).toBe(true);
    expect(repository.get("backup")).toEqual(primary);
  });

  it("does not create an empty backup without a primary save", () => {
    const repository = new InMemorySaveRepository();

    expect(backupCurrentSave(repository, "primary", "backup")).toBe(false);
    expect(repository.has("backup")).toBe(false);
  });

  it("frees a stale backup and lets the primary advance when LocalStorage is full", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = new QuotaStorage();
    const repository = new LocalStorageSaveRepository({ storage, keyPrefix: "test_" });
    const primary = makeSave(10, "x".repeat(200));
    repository.save("primary", primary);
    repository.save("backup", makeSave(5));
    storage.quota = storage.used;

    expect(backupCurrentSave(
      repository,
      "primary",
      "backup",
      { continueWithoutBackupOnStorageFailure: true },
    )).toBe(false);
    expect(repository.has("backup")).toBe(false);

    const advanced = makeSave(11, "x".repeat(220));
    repository.save("primary", advanced);
    expect(repository.get("primary")).toEqual(advanced);
  });

  it("keeps backup creation strict for destructive persistence flows", () => {
    const storage = new QuotaStorage();
    const repository = new LocalStorageSaveRepository({ storage, keyPrefix: "test_" });
    repository.save("primary", makeSave(10, "x".repeat(200)));
    repository.save("backup", makeSave(5));
    storage.quota = storage.used;

    expect(() => backupCurrentSave(repository, "primary", "backup"))
      .toThrow(SerializationFailedError);
    expect(repository.has("backup")).toBe(true);
  });

  it("loads the primary save when it is valid", () => {
    const repository = new InMemorySaveRepository();
    const loadSlot = vi.fn();

    expect(loadSaveWithBackup(repository, "primary", "backup", loadSlot)).toBe("primary");
    expect(loadSlot).toHaveBeenCalledOnce();
    expect(loadSlot).toHaveBeenCalledWith("primary");
  });

  it("loads and restores the backup when the primary fails", () => {
    const repository = new InMemorySaveRepository();
    const backup = makeSave(5);
    repository.save("backup", backup);
    const loadSlot = vi.fn((slotId: string) => {
      if (slotId === "primary") throw new Error("corrupt primary");
    });

    expect(loadSaveWithBackup(repository, "primary", "backup", loadSlot)).toBe("backup");
    expect(loadSlot).toHaveBeenNthCalledWith(1, "primary");
    expect(loadSlot).toHaveBeenNthCalledWith(2, "backup");
    expect(repository.get("primary")).toEqual(backup);
  });

  it("reclaims the invalid primary and retries backup restoration once", () => {
    const repository = new FirstRestoreFailingRepository();
    const invalidPrimary = makeSave(10);
    const backup = makeSave(5);
    repository.save("primary", invalidPrimary);
    repository.save("backup", backup);
    repository.failNextPrimaryWrite = true;
    const loadSlot = vi.fn((slotId: string) => {
      if (slotId === "primary") throw new Error("corrupt primary");
    });

    expect(loadSaveWithBackup(repository, "primary", "backup", loadSlot)).toBe("backup");
    expect(repository.get("primary")).toEqual(backup);
    expect(repository.get("backup")).toEqual(backup);
  });

  it("keeps a successfully loaded backup as the only recovery point when primary restoration still cannot fit", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repository = new RestoreFailingRepository();
    const backup = makeSave(5);
    repository.save("backup", backup);
    repository.failPrimaryWrites = true;
    const loadSlot = vi.fn((slotId: string) => {
      if (slotId === "primary") throw new Error("corrupt primary");
    });

    expect(loadSaveWithBackup(repository, "primary", "backup", loadSlot)).toBe("backup_unrestored");
    expect(loadSlot).toHaveBeenNthCalledWith(1, "primary");
    expect(loadSlot).toHaveBeenNthCalledWith(2, "backup");
    expect(repository.has("primary")).toBe(false);
    expect(repository.get("backup")).toEqual(backup);
  });

  it("preserves the primary error when no backup exists", () => {
    const repository = new InMemorySaveRepository();
    const primaryError = new Error("corrupt primary");
    const loadSlot = vi.fn(() => { throw primaryError; });

    expect(() => loadSaveWithBackup(repository, "primary", "backup", loadSlot))
      .toThrow(primaryError);
  });
});
