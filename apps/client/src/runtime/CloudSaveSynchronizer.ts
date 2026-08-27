import {
  LocalStorageSaveRepository,
  SaveValidator,
  type SaveFormat,
  type SaveRepository,
} from "@game/persistence";
import type { CloudSaveSlotId } from "@game/shared";
import type { CloudSaveClient } from "./CloudSaveClient";
import { CURRENT_RUNTIME_SAVE_VERSION } from "./saveMigrations";
import { PLAYER_SAVE_SLOT_IDS, getAccountSaveSlotId, getSaveBackupSlotId } from "./saveSlots";

const SERVER_SAVED_AT_KEY = "serverSavedAt";
const SERVER_NOW_KEY = "serverNow";

function latestValidLocal(
  repository: SaveRepository,
  primaryId: string,
  validator: SaveValidator,
): SaveFormat | undefined {
  const candidates: SaveFormat[] = [];
  for (const id of [primaryId, getSaveBackupSlotId(primaryId)]) {
    if (!repository.has(id)) continue;
    try {
      const candidate = repository.get(id);
      validator.validate(candidate);
      candidates.push(candidate);
    } catch (error) {
      console.error(`[Persistence] Ignoring invalid local save candidate "${id}":`, error);
    }
  }
  return candidates.sort((left, right) => right.metadata.updatedAt - left.metadata.updatedAt)[0];
}

function carryTrustedOfflineWindow(local: SaveFormat, cloud: SaveFormat): SaveFormat {
  const serverSavedAt = cloud.metadata.extra?.[SERVER_SAVED_AT_KEY];
  const serverNow = cloud.metadata.extra?.[SERVER_NOW_KEY];
  if (
    typeof serverSavedAt !== "number"
    || typeof serverNow !== "number"
    || !Number.isSafeInteger(serverSavedAt)
    || !Number.isSafeInteger(serverNow)
    || serverSavedAt < 0
    || serverNow < serverSavedAt
  ) {
    return local;
  }

  return {
    ...local,
    metadata: {
      ...local.metadata,
      extra: {
        ...local.metadata.extra,
        [SERVER_SAVED_AT_KEY]: serverSavedAt,
        [SERVER_NOW_KEY]: serverNow,
      },
    },
  };
}

/** Reconciles browser and server saves without deleting either side implicitly. */
export class CloudSaveSynchronizer {
  private readonly validator = new SaveValidator(CURRENT_RUNTIME_SAVE_VERSION);

  public constructor(
    private readonly accountId: string,
    private readonly client: CloudSaveClient,
    private readonly repository: SaveRepository = new LocalStorageSaveRepository(),
  ) {}

  public async synchronizeAll(): Promise<void> {
    await Promise.all(PLAYER_SAVE_SLOT_IDS.map((slotId) => this.synchronize(slotId)));
  }

  public async synchronize(slotId: CloudSaveSlotId): Promise<void> {
    const primaryId = getAccountSaveSlotId(this.accountId, slotId);
    const local = latestValidLocal(this.repository, primaryId, this.validator);
    const cloud = await this.client.get(slotId);
    if (cloud === undefined) {
      if (local !== undefined) {
        await this.uploadAndRefresh(slotId, primaryId, local);
      }
      return;
    }

    // Reconciliation only compares structurally intact snapshots. Version
    // compatibility and gameplay-provider validation remain RuntimePersistence's
    // responsibility when the selected slot is actually loaded.
    this.validator.validate(cloud);

    // Equal revisions deliberately prefer the cloud copy because it carries
    // server-authoritative timing metadata used by Background Progression.
    if (local === undefined || cloud.metadata.updatedAt >= local.metadata.updatedAt) {
      if (local !== undefined && cloud.metadata.updatedAt > local.metadata.updatedAt) {
        this.repository.save(getSaveBackupSlotId(primaryId), local);
      }
      this.repository.save(primaryId, cloud);
      return;
    }

    // The local payload may legitimately be newer when the final page-hide
    // upload did not finish. Uploading it here would stamp serverSavedAt with
    // the reconnect time and erase the whole offline window before gameplay
    // has a chance to resolve it. Keep the newer local payload, but attach the
    // trusted server window obtained from the cloud GET. RuntimePersistence
    // consumes that window once, saves the resolved state, then normal cloud
    // autosave uploads it with a fresh authoritative serverSavedAt.
    this.repository.save(primaryId, carryTrustedOfflineWindow(local, cloud));
  }

  private async uploadAndRefresh(
    slotId: CloudSaveSlotId,
    primaryId: string,
    local: SaveFormat,
  ): Promise<void> {
    await this.client.upload(slotId, local);
    const authoritative = await this.client.get(slotId);
    if (authoritative !== undefined) {
      this.validator.validate(authoritative);
      this.repository.save(primaryId, authoritative);
    }
  }
}
