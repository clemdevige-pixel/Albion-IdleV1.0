import { describe, expect, it, vi } from "vitest";
import {
  computeChecksum,
  InMemorySaveRepository,
  type SaveFormat,
} from "@game/persistence";
import { LocalSaveSlotCatalog } from "./LocalSaveSlotCatalog";
import {
  LEGACY_SAVE_SLOT_ID,
  PLAYER_SAVE_SLOT_IDS,
  getAccountSaveSlotId,
  getSaveBackupSlotId,
} from "./saveSlots";

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";

class MemoryMarkerStore {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createSave(marker: string, updatedAt: number = 2): SaveFormat {
  const payload = { marker };
  return {
    version: 2,
    metadata: { version: 2, createdAt: 1, updatedAt, buildVersion: marker, seed: 42 },
    payload,
    checksum: computeChecksum(payload),
  };
}

describe("LocalSaveSlotCatalog", () => {
  it("migrates legacy primary and backup then removes validated redundant copies", () => {
    const repository = new InMemorySaveRepository();
    const primary = createSave("legacy-primary");
    const backup = createSave("legacy-backup");
    repository.save(LEGACY_SAVE_SLOT_ID, primary);
    repository.save(getSaveBackupSlotId(LEGACY_SAVE_SLOT_ID), backup);
    const catalog = new LocalSaveSlotCatalog(ACCOUNT_A, repository, new MemoryMarkerStore());

    expect(catalog.migrateLocalSavesToAccount()).toBe(true);
    const accountSlot = getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[0]);
    expect(repository.get(accountSlot)).toEqual(primary);
    expect(repository.get(getSaveBackupSlotId(accountSlot))).toEqual(backup);
    expect(repository.has(PLAYER_SAVE_SLOT_IDS[0])).toBe(false);
    expect(repository.has(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]))).toBe(false);
    expect(repository.has(LEGACY_SAVE_SLOT_ID)).toBe(false);
    expect(repository.has(getSaveBackupSlotId(LEGACY_SAVE_SLOT_ID))).toBe(false);
  });

  it("never overwrites an existing player slot before migrating it to the account", () => {
    const repository = new InMemorySaveRepository();
    const current = createSave("current", 10);
    repository.save(PLAYER_SAVE_SLOT_IDS[0], current);
    repository.save(LEGACY_SAVE_SLOT_ID, createSave("legacy", 2));
    const catalog = new LocalSaveSlotCatalog(ACCOUNT_A, repository, new MemoryMarkerStore());

    expect(catalog.migrateLocalSavesToAccount()).toBe(true);
    expect(repository.get(getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[0]))).toEqual(current);
    expect(repository.has(PLAYER_SAVE_SLOT_IDS[0])).toBe(false);
    expect(repository.has(LEGACY_SAVE_SLOT_ID)).toBe(false);
  });

  it("deletes only the selected account-scoped slot and its backup", () => {
    const repository = new InMemorySaveRepository();
    repository.save(PLAYER_SAVE_SLOT_IDS[0], createSave("slot-1"));
    repository.save(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]), createSave("slot-1-backup"));
    repository.save(PLAYER_SAVE_SLOT_IDS[1], createSave("slot-2"));
    const markerStore = new MemoryMarkerStore();
    const catalog = new LocalSaveSlotCatalog(ACCOUNT_A, repository, markerStore);

    expect(catalog.migrateLocalSavesToAccount()).toBe(true);

    catalog.deleteSlot(PLAYER_SAVE_SLOT_IDS[0]);

    expect(repository.has(PLAYER_SAVE_SLOT_IDS[0])).toBe(false);
    expect(repository.has(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]))).toBe(false);
    expect(repository.has(PLAYER_SAVE_SLOT_IDS[1])).toBe(false);
    expect(repository.has(getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[0]))).toBe(false);
    expect(repository.has(getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[1]))).toBe(true);
  });

  it("allows only the first authenticated account to claim unscoped local saves", () => {
    const repository = new InMemorySaveRepository();
    const markerStore = new MemoryMarkerStore();
    repository.save(PLAYER_SAVE_SLOT_IDS[0], createSave("existing-local-save"));

    const firstAccount = new LocalSaveSlotCatalog(ACCOUNT_A, repository, markerStore);
    const secondAccount = new LocalSaveSlotCatalog(ACCOUNT_B, repository, markerStore);

    expect(firstAccount.migrateLocalSavesToAccount()).toBe(true);
    expect(secondAccount.migrateLocalSavesToAccount()).toBe(false);
    expect(firstAccount.listSlots()[0]?.hasSave).toBe(true);
    expect(secondAccount.listSlots()[0]?.hasSave).toBe(false);
  });

  it("detects previously claimed account saves only when current account is empty", () => {
    const repository = new InMemorySaveRepository();
    const markerStore = new MemoryMarkerStore();
    repository.save(PLAYER_SAVE_SLOT_IDS[0], createSave("existing-local-save"));

    const firstAccount = new LocalSaveSlotCatalog(ACCOUNT_A, repository, markerStore);
    expect(firstAccount.migrateLocalSavesToAccount()).toBe(true);

    const secondAccount = new LocalSaveSlotCatalog(ACCOUNT_B, repository, markerStore);
    expect(secondAccount.getRecoverablePreviousAccountId()).toBe(ACCOUNT_A);

    repository.save(getAccountSaveSlotId(ACCOUNT_B, PLAYER_SAVE_SLOT_IDS[1]), createSave("new-account"));
    expect(secondAccount.getRecoverablePreviousAccountId()).toBeUndefined();
  });

  it("recovers validated previous-account saves without deleting rollback copies", () => {
    const repository = new InMemorySaveRepository();
    const markerStore = new MemoryMarkerStore();
    const primary = createSave("old-primary", 20);
    const backup = createSave("old-backup", 19);
    repository.save(PLAYER_SAVE_SLOT_IDS[0], primary);
    repository.save(getSaveBackupSlotId(PLAYER_SAVE_SLOT_IDS[0]), backup);

    const firstAccount = new LocalSaveSlotCatalog(ACCOUNT_A, repository, markerStore);
    expect(firstAccount.migrateLocalSavesToAccount()).toBe(true);

    const secondAccount = new LocalSaveSlotCatalog(ACCOUNT_B, repository, markerStore);
    expect(secondAccount.recoverPreviousAccountSaves(ACCOUNT_A)).toBe(true);

    const oldSlot = getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[0]);
    const newSlot = getAccountSaveSlotId(ACCOUNT_B, PLAYER_SAVE_SLOT_IDS[0]);
    expect(repository.get(newSlot)).toEqual(primary);
    expect(repository.get(getSaveBackupSlotId(newSlot))).toEqual(backup);
    expect(repository.get(oldSlot)).toEqual(primary);
    expect(repository.get(getSaveBackupSlotId(oldSlot))).toEqual(backup);
    expect(secondAccount.listSlots()[0]?.hasSave).toBe(true);
    expect(secondAccount.getRecoverablePreviousAccountId()).toBeUndefined();
  });

  it("refuses recovery when the current account already owns a save", () => {
    const repository = new InMemorySaveRepository();
    const markerStore = new MemoryMarkerStore();
    repository.save(PLAYER_SAVE_SLOT_IDS[0], createSave("old"));
    const firstAccount = new LocalSaveSlotCatalog(ACCOUNT_A, repository, markerStore);
    expect(firstAccount.migrateLocalSavesToAccount()).toBe(true);

    repository.save(getAccountSaveSlotId(ACCOUNT_B, PLAYER_SAVE_SLOT_IDS[0]), createSave("current"));
    const secondAccount = new LocalSaveSlotCatalog(ACCOUNT_B, repository, markerStore);
    expect(secondAccount.recoverPreviousAccountSaves(ACCOUNT_A)).toBe(false);
  });

  it("preserves a newer unscoped save instead of deleting it behind an older account copy", () => {
    const repository = new InMemorySaveRepository();
    const source = createSave("newer-local", 20);
    const target = createSave("older-account", 10);
    const accountSlot = getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[0]);
    repository.save(PLAYER_SAVE_SLOT_IDS[0], source);
    repository.save(accountSlot, target);
    const catalog = new LocalSaveSlotCatalog(ACCOUNT_A, repository, new MemoryMarkerStore());

    expect(catalog.migrateLocalSavesToAccount()).toBe(false);
    expect(repository.get(PLAYER_SAVE_SLOT_IDS[0])).toEqual(source);
    expect(repository.get(accountSlot)).toEqual(target);
  });

  it("preserves migration sources when the account target fails checksum validation", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repository = new InMemorySaveRepository();
    const source = createSave("valid-source", 10);
    const invalidTarget = { ...createSave("invalid-target", 20), checksum: "bad-checksum" };
    const accountSlot = getAccountSaveSlotId(ACCOUNT_A, PLAYER_SAVE_SLOT_IDS[0]);
    repository.save(PLAYER_SAVE_SLOT_IDS[0], source);
    repository.save(accountSlot, invalidTarget);
    const catalog = new LocalSaveSlotCatalog(ACCOUNT_A, repository, new MemoryMarkerStore());

    expect(catalog.migrateLocalSavesToAccount()).toBe(false);
    expect(repository.get(PLAYER_SAVE_SLOT_IDS[0])).toEqual(source);
  });
});
