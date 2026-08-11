import { describe, expect, it, vi } from "vitest";
import { InMemorySaveRepository, type SaveFormat } from "@game/persistence";
import { backupCurrentSave, loadSaveWithBackup } from "./saveBackup";

function makeSave(updatedAt: number): SaveFormat {
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 0,
      updatedAt,
      buildVersion: "test",
      seed: 42,
    },
    payload: { updatedAt },
    checksum: `checksum-${String(updatedAt)}`,
  };
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

  it("preserves the primary error when no backup exists", () => {
    const repository = new InMemorySaveRepository();
    const primaryError = new Error("corrupt primary");
    const loadSlot = vi.fn(() => { throw primaryError; });

    expect(() => loadSaveWithBackup(repository, "primary", "backup", loadSlot))
      .toThrow(primaryError);
  });
});
