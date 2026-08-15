import type { CloudSaveDocument, CloudSaveSlotId, CloudSaveSummary } from "@game/shared";

export interface CloudSaveRepository {
  list(accountId: string): Promise<readonly CloudSaveSummary[]>;
  get(accountId: string, slotId: CloudSaveSlotId): Promise<CloudSaveDocument | undefined>;
  save(accountId: string, slotId: CloudSaveSlotId, document: CloudSaveDocument): Promise<boolean>;
  delete(accountId: string, slotId: CloudSaveSlotId): Promise<void>;
}

export class InMemoryCloudSaveRepository implements CloudSaveRepository {
  private readonly saves = new Map<string, CloudSaveDocument>();
  private key(accountId: string, slotId: CloudSaveSlotId): string { return `${accountId}:${slotId}`; }
  public list(accountId: string): Promise<readonly CloudSaveSummary[]> {
    return Promise.resolve((["player_slot_1", "player_slot_2", "player_slot_3"] as const).flatMap((slotId) => {
      const document = this.saves.get(this.key(accountId, slotId));
      return document === undefined ? [] : [{ slotId, updatedAt: document.metadata.updatedAt }];
    }));
  }
  public get(accountId: string, slotId: CloudSaveSlotId): Promise<CloudSaveDocument | undefined> {
    return Promise.resolve(this.saves.get(this.key(accountId, slotId)));
  }
  public save(accountId: string, slotId: CloudSaveSlotId, document: CloudSaveDocument): Promise<boolean> {
    const key = this.key(accountId, slotId);
    const current = this.saves.get(key);
    if (current !== undefined && current.metadata.updatedAt > document.metadata.updatedAt) return Promise.resolve(false);
    this.saves.set(key, document);
    return Promise.resolve(true);
  }
  public delete(accountId: string, slotId: CloudSaveSlotId): Promise<void> {
    this.saves.delete(this.key(accountId, slotId));
    return Promise.resolve();
  }
}
