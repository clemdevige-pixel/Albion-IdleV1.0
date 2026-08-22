import { describe, expect, it } from "vitest";
import type { SaveFormat } from "@game/persistence";
import { resolveTrustedOfflineElapsedMs } from "./trustedOfflineElapsed.js";

function makeSave(extra?: Record<string, unknown>): SaveFormat {
  return {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 1,
      updatedAt: 2,
      buildVersion: "test",
      seed: 42,
      ...(extra === undefined ? {} : { extra }),
    },
    payload: {},
    checksum: "test",
  };
}

describe("trusted offline elapsed", () => {
  it("uses only server-authored timestamps", () => {
    expect(resolveTrustedOfflineElapsedMs(makeSave({ serverSavedAt: 1_000, serverNow: 4_500 }))).toBe(3_500);
  });

  it("fails closed when trusted timestamps are absent or invalid", () => {
    expect(resolveTrustedOfflineElapsedMs(makeSave())).toBe(0);
    expect(resolveTrustedOfflineElapsedMs(makeSave({ serverSavedAt: 5_000, serverNow: 4_000 }))).toBe(0);
    expect(resolveTrustedOfflineElapsedMs(makeSave({ serverSavedAt: "1000", serverNow: 4_000 }))).toBe(0);
  });
});
