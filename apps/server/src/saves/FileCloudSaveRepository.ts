import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { CloudSaveDocumentSchema, type CloudSaveDocument, type CloudSaveSlotId, type CloudSaveSummary } from "@game/shared";
import { z } from "zod";
import type { CloudSaveRepository } from "./CloudSaveRepository.js";

const StoreSchema = z.object({ version: z.literal(1), saves: z.record(CloudSaveDocumentSchema) });
type Store = z.infer<typeof StoreSchema>;

export class FileCloudSaveRepository implements CloudSaveRepository {
  private store: Store = { version: 1, saves: {} };
  private readonly ready: Promise<void>;
  private queue: Promise<void> = Promise.resolve();
  public constructor(private readonly filePath: string) { this.ready = this.load(); }
  private key(accountId: string, slotId: CloudSaveSlotId): string { return `${accountId}:${slotId}`; }
  public async list(accountId: string): Promise<readonly CloudSaveSummary[]> {
    await this.awaitCurrent();
    const prefix = `${accountId}:`;
    return Object.entries(this.store.saves).flatMap(([key, document]) => key.startsWith(prefix)
      ? [{ slotId: key.slice(prefix.length) as CloudSaveSlotId, updatedAt: document.metadata.updatedAt }]
      : []);
  }
  public async get(accountId: string, slotId: CloudSaveSlotId): Promise<CloudSaveDocument | undefined> { await this.awaitCurrent(); return this.store.saves[this.key(accountId, slotId)]; }
  public async save(accountId: string, slotId: CloudSaveSlotId, document: CloudSaveDocument): Promise<boolean> {
    let accepted = false;
    await this.mutate(() => {
      const key = this.key(accountId, slotId);
      const current = this.store.saves[key];
      if (current !== undefined && current.metadata.updatedAt > document.metadata.updatedAt) return;
      this.store.saves[key] = document;
      accepted = true;
    });
    return accepted;
  }
  public async delete(accountId: string, slotId: CloudSaveSlotId): Promise<void> { await this.mutate(() => { delete this.store.saves[this.key(accountId, slotId)]; }); }
  private async load(): Promise<void> {
    try { this.store = StoreSchema.parse(JSON.parse(await readFile(this.filePath, "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Unable to load cloud save store at ${this.filePath}`, { cause: error }); }
  }
  private async awaitCurrent(): Promise<void> { await this.ready; await this.queue; }
  private async mutate(change: () => void): Promise<void> { const operation = this.queue.then(async () => { await this.ready; change(); await this.persist(); }); this.queue = operation.catch(() => undefined); return operation; }
  private async persist(): Promise<void> { const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`; await mkdir(dirname(this.filePath), { recursive: true }); await writeFile(temporary, `${JSON.stringify(this.store)}\n`, { encoding: "utf8", mode: 0o600 }); await rename(temporary, this.filePath); }
}
