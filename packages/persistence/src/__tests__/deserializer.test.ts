import { describe, it, expect } from "vitest";
import { deserialize } from "../deserializer.js";
import { DeserializationFailedError } from "../errors.js";
import { computeChecksum } from "../serializer.js";

function makeSaveJson(overrides?: Record<string, unknown>): string {
  const payload = { test: "data" };
  const base = {
    version: 1,
    metadata: {
      version: 1,
      createdAt: 0,
      updatedAt: 0,
      buildVersion: "0.1.0",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
    ...overrides,
  };
  return JSON.stringify(base);
}

describe("deserialize", () => {
  it("parses valid save data", () => {
    const result = deserialize(makeSaveJson());
    expect(result.version).toBe(1);
    expect(result.payload).toEqual({ test: "data" });
  });

  it("throws on invalid JSON", () => {
    expect(() => deserialize("not json")).toThrow(DeserializationFailedError);
  });

  it("throws on missing required fields", () => {
    expect(() => deserialize(JSON.stringify({ version: 1 }))).toThrow(
      DeserializationFailedError,
    );
  });

  it("throws on invalid version type", () => {
    expect(() => deserialize(makeSaveJson({ version: "bad" }))).toThrow(
      DeserializationFailedError,
    );
  });
});
