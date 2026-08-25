import type { SaveProvider } from "./save-provider.js";

export class SnapshotLoader {
  private readonly providers = new Map<string, SaveProvider>();

  register(provider: SaveProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  load(payload: Record<string, unknown>): void {
    for (const [id, provider] of this.providers) {
      if (!(id in payload)) continue;
      try {
        provider.load(payload[id]);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load save provider "${id}": ${reason}`, { cause: error });
      }
    }
  }
}
