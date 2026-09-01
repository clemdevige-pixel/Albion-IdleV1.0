import {
  CLOUD_SAVES_ROUTE,
  CloudSaveDocumentSchema,
  CloudSaveListSchema,
  type CloudSaveDocument,
  type CloudSaveList,
  type CloudSaveSlotId,
} from "@game/shared";
import { fetchWithTimeout } from "./fetchWithTimeout";

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, "") ?? "";

export class CloudSaveClient {
  private uploadQueue: Promise<void> = Promise.resolve();
  public constructor(private readonly token: string) {}
  private endpoint(path: string): string { return `${API_ORIGIN}${path}`; }
  private headers(json = false): HeadersInit { return { authorization: `Bearer ${this.token}`, ...(json ? { "content-type": "application/json" } : {}) }; }
  public async list(): Promise<CloudSaveList> { const response = await fetchWithTimeout(this.endpoint(CLOUD_SAVES_ROUTE), { headers: this.headers() }); if (!response.ok) throw new Error("Cloud save list failed"); return CloudSaveListSchema.parse(await response.json()); }
  public async get(slotId: CloudSaveSlotId): Promise<CloudSaveDocument | undefined> { const response = await fetchWithTimeout(this.endpoint(`${CLOUD_SAVES_ROUTE}/${slotId}`), { headers: this.headers() }); if (response.status === 404) return undefined; if (!response.ok) throw new Error("Cloud save download failed"); return CloudSaveDocumentSchema.parse(await response.json()); }
  public upload(slotId: CloudSaveSlotId, document: CloudSaveDocument): Promise<void> {
    const operation = this.uploadQueue.then(async () => {
      const response = await fetchWithTimeout(this.endpoint(`${CLOUD_SAVES_ROUTE}/${slotId}`), { method: "PUT", headers: this.headers(true), body: JSON.stringify(document) });
      if (!response.ok) throw new Error("Cloud save upload failed");
    });
    this.uploadQueue = operation.catch((error) => { console.error("[CloudSave] Upload failed; local save preserved:", error); });
    return operation;
  }
  public async delete(slotId: CloudSaveSlotId): Promise<void> { const response = await fetchWithTimeout(this.endpoint(`${CLOUD_SAVES_ROUTE}/${slotId}`), { method: "DELETE", headers: this.headers() }); if (!response.ok && response.status !== 404) throw new Error("Cloud save deletion failed"); }
}
