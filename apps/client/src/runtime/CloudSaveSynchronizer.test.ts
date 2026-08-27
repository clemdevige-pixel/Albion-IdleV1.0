import { describe, expect, it, vi } from "vitest";
import {
  computeChecksum,
  InMemorySaveRepository,
  type SaveFormat,
} from "@game/persistence";
import type { CloudSaveClient } from "./CloudSaveClient.js";
import { CloudSaveSynchronizer } from "./CloudSaveSynchronizer.js";
import { getAccountSaveSlotId } from "./saveSlots.js";
import {
  TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY,
  resolveTrustedOfflineElapsedMs,
} from "./trustedOfflineElapsed.js";

function save(updatedAt: number, payloadMarker: string, extra?: Record<string, unknown>): SaveFormat {
  const payload = { marker: payloadMarker };
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
    payload,
    checksum: computeChecksum(payload),
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

  it("refuses a cloud snapshot with an invalid checksum without replacing local data", async () => {
    const repository = new InMemorySaveRepository();
    const accountId = "account_test";
    const slotId = "player_slot_1" as const;
    const primaryId = getAccountSaveSlotId(accountId, slotId);
    const local = save(100, "valid-local");
    repository.save(primaryId, local);

    const corruptedCloud = {
      ...save(200, "corrupted-cloud"),
      checksum: "invalid",
    };
    const client = {
      get: vi.fn(() => Promise.resolve(corruptedCloud)),
      upload: vi.fn(() => Promise.resolve()),
    } as unknown as CloudSaveClient;

    const synchronizer = new CloudSaveSynchronizer(accountId, client, repository);
    await expect(synchronizer.synchronize(slotId)).rejects.toThrow("Checksum mismatch");
    expect(repository.get(primaryId)).toEqual(local);
  });
});