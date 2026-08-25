import { describe, expect, it } from "vitest";
import type { SaveProvider } from "../save-provider.js";
import { SnapshotLoader } from "../snapshot-loader.js";

class ThrowingProvider implements SaveProvider {
  readonly providerId = "broken_provider";

  save(): unknown {
    return {};
  }

  load(): void {
    throw new Error("invalid payload");
  }
}

describe("SnapshotLoader provider errors", () => {
  it("includes the provider id when restore fails", () => {
    const loader = new SnapshotLoader();
    loader.register(new ThrowingProvider());

    expect(() => loader.load({ broken_provider: {} })).toThrow(
      'Failed to load save provider "broken_provider": invalid payload',
    );
  });
});
