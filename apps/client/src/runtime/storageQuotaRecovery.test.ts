import { describe, expect, it } from "vitest";
import { InMemorySaveRepository, type SaveFormat } from "@game/persistence";
import { reclaimRedundantSaveBackups } from "./storageQuotaRecovery";

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

describe("storage quota recovery", () => {
  it("removes only redundant backups whose primary still exists", () => {
    const repository = new InMemorySaveRepository();
    repository.save("slot_1", makeSave(10));
    repository.save("slot_1_backup", makeSave(9));
    repository.save("slot_2_backup", makeSave(8));
    repository.save("slot_3", makeSave(7));
    repository.save("slot_3_backup", makeSave(6));

    const reclaimed = reclaimRedundantSaveBackups(repository, "slot_3_backup");

    expect(reclaimed).toEqual(["slot_1_backup"]);
    expect(repository.has("slot_1_backup")).toBe(false);
    expect(repository.has("slot_2_backup")).toBe(true);
    expect(repository.has("slot_3_backup")).toBe(true);
  });

  it("never removes the protected current-slot backup", () => {
    const repository = new InMemorySaveRepository();
    repository.save("slot", makeSave(10));
    repository.save("slot_backup", makeSave(9));

    expect(reclaimRedundantSaveBackups(repository, "slot_backup")).toEqual([]);
    expect(repository.has("slot_backup")).toBe(true);
  });
});
