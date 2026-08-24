import { describe, expect, it, vi } from "vitest";
import { InMemorySaveRepository, type SaveFormat } from "@game/persistence";
import type { CloudSaveClient } from "./CloudSaveClient.js";
import { CloudSaveSynchronizer } from "./CloudSaveSynchronizer.js";
import { getAccountSaveSlotId } from "./saveSlots.js";
import { resolveTrustedOfflineElapsedMs } from "./trustedOfflineElapsed.js";

function save(updatedAt: number, payloadMarker: string, extra?: Record<string, unknown>): SaveFormat {
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 1,
      updatedAt,
      buildVersion: "test",
      seed: 42,
      ...(extra === undefined ? {} : { extra }),
    },
    payload: { marker: payloadMarker },
    checksum: "test",
  };
}

describe("CloudSaveSynchronizer", () => {
  it("keeps a newer local payload and carries the trusted cloud offline window without uploading first", async () => {
    const repository = new InMemorySaveRepository();
    const accountId = "account_test";
    const slotId = "player_slot_1" as const;
    const primaryId = getAccountSaveSlotId(accountId, slotId);
    repository.save(primaryId, save(200, "local-expedition-active"));

    const cloud = save(100, "older-cloud", {
      serverSavedAt: 1_000,
      serverNow: 11_000,
    });
    const upload = vi.fn(async () => undefined);
    const client = {
      get: vi.fn(async () => cloud),
      upload,
    } as unknown as CloudSaveClient;

    const synchronizer = new CloudSaveSynchronizer(accountId, client, repository);
    await synchronizer.synchronize(slotId);

    const reconciled = repository.get(primaryId);
    expect(reconciled.payload.marker).toBe("local-expedition-active");
    expect(resolveTrustedOfflineElapsedMs(reconciled)).toBe(10_000);
    expect(upload).not.toHaveBeenCalled();
  });
});
