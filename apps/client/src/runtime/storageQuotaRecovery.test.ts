import { describe, expect, it, vi } from "vitest";
import {
  computeChecksum,
  InMemorySaveRepository,
  type SaveFormat,
} from "@game/persistence";
import { reclaimRedundantSaveBackups } from "./storageQuotaRecovery";

function makeSave(updatedAt: number, payloadValue = updatedAt): SaveFormat {
  const payload = { value: payloadValue };
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 0,
      updatedAt,
      buildVersion: "test",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
  };
}

describe("storage quota recovery", () => {
  it("removes only backups proven redundant with a validated identical primary payload", () => {
    const repository = new InMemorySaveRepository();
    repository.save("slot_1", makeSave(10, 1));
    repository.save("slot_1_backup", makeSave(9, 1));
    repository.save("slot_2_backup", makeSave(8, 2));
    repository.save("slot_3", makeSave(7, 3));
    repository.save("slot_3_backup", makeSave(6, 3));

    const reclaimed = reclaimRedundantSaveBackups(repository, "slot_3_backup");

    expect(reclaimed).toEqual(["slot_1_backup"]);
    expect(repository.has("slot_1_backup")).toBe(false);
    expect(repository.has("slot_2_backup")).toBe(true);
    expect(repository.has("slot_3_backup")).toBe(true);
  });

  it("preserves a backup when the primary exists but contains different state", () => {
    const repository = new InMemorySaveRepository();
    repository.save("slot", makeSave(10, 10));
    repository.save("slot_backup", makeSave(9, 9));

    expect(reclaimRedundantSaveBackups(repository, "other_backup")).toEqual([]);
    expect(repository.has("slot_backup")).toBe(true);
  });

  it("preserves a backup when the primary checksum is invalid", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repository = new InMemorySaveRepository();
    const invalidPrimary = { ...makeSave(10, 10), checksum: "corrupt" };
    repository.save("slot", invalidPrimary);
    repository.save("slot_backup", makeSave(9, 9));

    expect(reclaimRedundantSaveBackups(repository, "other_backup")).toEqual([]);
    expect(repository.has("slot_backup")).toBe(true);
  });

  it("never removes the protected current-slot backup", () => {
    const repository = new InMemorySaveRepository();
    repository.save("slot", makeSave(10, 1));
    repository.save("slot_backup", makeSave(9, 1));

    expect(reclaimRedundantSaveBackups(repository, "slot_backup")).toEqual([]);
    expect(repository.has("slot_backup")).toBe(true);
  });
});
