import { LocalStorageSaveRepository, type SaveFormat, type SaveRepository } from "@game/persistence";
import type { CloudSaveSlotId } from "@game/shared";
import type { CloudSaveClient } from "./CloudSaveClient";
import { PLAYER_SAVE_SLOT_IDS, getAccountSaveSlotId, getSaveBackupSlotId } from "./saveSlots";

function latestLocal(repository: SaveRepository, primaryId: string): SaveFormat | undefined {
  return [primaryId, getSaveBackupSlotId(primaryId)]
    .filter((id) => repository.has(id))
    .map((id) => repository.get(id))
    .sort((left, right) => right.metadata.updatedAt - left.metadata.updatedAt)[0];
}

/** Reconciles browser and server saves without deleting either side implicitly. */
export class CloudSaveSynchronizer {
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
    const local = latestLocal(this.repository, primaryId);
    const cloud = await this.client.get(slotId);
    if (cloud === undefined) {
      if (local !== undefined) {
        await this.uploadAndRefresh(slotId, primaryId, local);
      }
      return;
    }

    // Equal revisions deliberately prefer the cloud copy because it carries
    // server-authoritative timing metadata used by Background Progression.
    if (local === undefined || cloud.metadata.updatedAt >= local.metadata.updatedAt) {
      if (local !== undefined && cloud.metadata.updatedAt > local.metadata.updatedAt) {
        this.repository.save(getSaveBackupSlotId(primaryId), local);
      }
      this.repository.save(primaryId, cloud);
      return;
    }

    // A newer local revision cannot safely claim offline time. Upload it, then
    // refresh from the server so the next load starts from a trusted timestamp.
    await this.uploadAndRefresh(slotId, primaryId, local);
  }

  private async uploadAndRefresh(
    slotId: CloudSaveSlotId,
    primaryId: string,
    local: SaveFormat,
  ): Promise<void> {
    await this.client.upload(slotId, local);
    const authoritative = await this.client.get(slotId);
    if (authoritative !== undefined) {
      this.repository.save(primaryId, authoritative);
    }
  }
}
