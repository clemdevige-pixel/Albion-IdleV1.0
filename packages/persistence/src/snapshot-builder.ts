import type { SaveProvider } from "./save-provider.js";

export class SnapshotBuilder {
  private readonly providers = new Map<string, SaveProvider>();

  register(provider: SaveProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  build(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const [id, provider] of this.providers) {
      payload[id] = provider.save();
    }
    return payload;
  }
}
