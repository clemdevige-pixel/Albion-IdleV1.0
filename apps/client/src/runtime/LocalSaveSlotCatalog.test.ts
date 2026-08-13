import { describe, expect, it } from "vitest";
import { InMemorySaveRepository, type SaveFormat } from "@game/persistence";
import { LocalSaveSlotCatalog } from "./LocalSaveSlotCatalog";
import { LEGACY_SAVE_SLOT_ID, PLAYER_SAVE_SLOT_IDS, getSaveBackupSlotId } from "./saveSlots";

class MemoryMarkerStore {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createSave(marker: string): SaveFormat {
  return {
    version: 2,
    metadata: { version: 2, createdAt: 1, updatedAt: 2, buildVersion: marker, seed: 42 },
    payload: {},
    checksum: "checksum",
  };
}

describe("LocalSaveSlotCatalog", () => {
  it("copies the legacy primary and backup into slot 1 without deleting them", () => {
    const repository = new InMemorySaveRepository();
    const primary = createSave("legacy-primary");
    const backup = createSave("legacy-backup");
    repository.save(LEGACY_SAVE_SLOT_ID, primary);
    repository.save(getSaveBackupSlotId(LEGACY_SAVE_SLOT_ID), backup);
    const catalog = new LocalSaveSlotCatalog(repository, new MemoryMarkerStore());

    expect(catalog.migrateLegacySaveToFirstSlot()).toBe(true);
    expect(repository.get(PLAYER_SAVE_SLOT_IDS[0])).toEqual(primary);
    expect(repository.get(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]))).toEqual(backup);
    expect(repository.get(LEGACY_SAVE_SLOT_ID)).toEqual(primary);
    expect(repository.get(getSaveBackupSlotId(LEGACY_SAVE_SLOT_ID))).toEqual(backup);

    catalog.deleteSlot(PLAYER_SAVE_SLOT_IDS[0]);
    expect(catalog.migrateLegacySaveToFirstSlot()).toBe(false);
    expect(repository.has(PLAYER_SAVE_SLOT_IDS[0])).toBe(false);
  });

  it("never overwrites an existing player slot", () => {
    const repository = new InMemorySaveRepository();
    const current = createSave("current");
    repository.save(PLAYER_SAVE_SLOT_IDS[0], current);
    repository.save(LEGACY_SAVE_SLOT_ID, createSave("legacy"));
    const catalog = new LocalSaveSlotCatalog(repository, new MemoryMarkerStore());

    expect(catalog.migrateLegacySaveToFirstSlot()).toBe(false);
    expect(repository.get(PLAYER_SAVE_SLOT_IDS[0])).toEqual(current);
  });

  it("deletes only the selected slot and its backup", () => {
    const repository = new InMemorySaveRepository();
    repository.save(PLAYER_SAVE_SLOT_IDS[0], createSave("slot-1"));
    repository.save(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]), createSave("slot-1-backup"));
    repository.save(PLAYER_SAVE_SLOT_IDS[1], createSave("slot-2"));
    const markerStore = new MemoryMarkerStore();
    const catalog = new LocalSaveSlotCatalog(repository, markerStore);

    catalog.deleteSlot(PLAYER_SAVE_SLOT_IDS[0]);

    expect(repository.has(PLAYER_SAVE_SLOT_IDS[0])).toBe(false);
    expect(repository.has(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]))).toBe(false);
    expect(repository.has(PLAYER_SAVE_SLOT_IDS[1])).toBe(true);
  });
});
