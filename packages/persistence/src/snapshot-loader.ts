import type { SaveProvider } from "./save-provider.js";

export class SnapshotLoader {
  private readonly providers = new Map<string, SaveProvider>();

  register(provider: SaveProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  load(payload: Record<string, unknown>): void {
    for (const [id, provider] of this.providers) {
      if (id in payload) {
        provider.load(payload[id]);
      }
    }
  }
}
