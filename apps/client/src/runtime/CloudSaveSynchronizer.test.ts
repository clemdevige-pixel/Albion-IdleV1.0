import { describe, expect, it, vi } from "vitest";
import { InMemorySaveRepository, type SaveFormat } from "@game/persistence";
import type { CloudSaveClient } from "./CloudSaveClient.js";
import { CloudSaveSynchronizer } from "./CloudSaveSynchronizer.js";
import { getAccountSaveSlotId } from "./saveSlots.js";
import {
  TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY,
  resolveTrustedOfflineElapsedMs,
} from "./trustedOfflineElapsed.js";

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
    const upload = vi.fn(() => Promise.resolve());
    const client = {
      get: vi.fn(() => Promise.resolve(cloud)),
      upload,
    } as unknown as CloudSaveClient;

    const synchronizer = new CloudSaveSynchronizer(accountId, client, repository);
    await synchronizer.synchronize(slotId);

    const reconciled = repository.get(primaryId);
    expect(reconciled.payload.marker).toBe("local-expedition-active");
    expect(resolveTrustedOfflineElapsedMs(reconciled)).toBe(10_000);
    expect(upload).not.toHaveBeenCalled();
  });

  it("carries only the unseen suffix when the previous cloud window was already resolved", async () => {
    const repository = new InMemorySaveRepository();
    const accountId = "account_test";
    const slotId = "player_slot_1" as const;
    const primaryId = getAccountSaveSlotId(accountId, slotId);
    repository.save(primaryId, save(200, "resolved-local", {
      [TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY]: 11_000,
    }));

    const cloud = save(100, "older-cloud", {
      serverSavedAt: 1_000,
      serverNow: 12_000,
    });
    const client = {
      get: vi.fn(() => Promise.resolve(cloud)),
      upload: vi.fn(() => Promise.resolve()),
    } as unknown as CloudSaveClient;

    const synchronizer = new CloudSaveSynchronizer(accountId, client, repository);
    await synchronizer.synchronize(slotId);

    expect(resolveTrustedOfflineElapsedMs(repository.get(primaryId))).toBe(1_000);
  });

  it("does not replay an unchanged cloud window after it was already resolved", async () => {
    const repository = new InMemorySaveRepository();
    const accountId = "account_test";
    const slotId = "player_slot_1" as const;
    const primaryId = getAccountSaveSlotId(accountId, slotId);
    repository.save(primaryId, save(200, "resolved-local", {
      [TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY]: 11_000,
    }));

    const cloud = save(100, "older-cloud", {
      serverSavedAt: 1_000,
      serverNow: 11_000,
    });
    const client = {
      get: vi.fn(() => Promise.resolve(cloud)),
      upload: vi.fn(() => Promise.resolve()),
    } as unknown as CloudSaveClient;

    const synchronizer = new CloudSaveSynchronizer(accountId, client, repository);
    await synchronizer.synchronize(slotId);

    expect(resolveTrustedOfflineElapsedMs(repository.get(primaryId))).toBe(0);
  });
});
