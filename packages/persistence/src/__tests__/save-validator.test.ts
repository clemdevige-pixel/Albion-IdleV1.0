import { describe, it, expect } from "vitest";
import { SaveValidator } from "../save-validator.js";
import { InvalidSaveError, VersionMismatchError } from "../errors.js";
import { computeChecksum } from "../serializer.js";
import type { SaveFormat } from "../save-format.js";

function makeSave(overrides?: Partial<SaveFormat>): SaveFormat {
  const payload = { test: true };
  return {
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
}

describe("SaveValidator", () => {
  const validator = new SaveValidator(1);

  it("accepts a valid save", () => {
    expect(() => validator.validate(makeSave())).not.toThrow();
  });

  it("rejects invalid checksum", () => {
    expect(() =>
      validator.validate(makeSave({ checksum: "00000000" })),
    ).toThrow(InvalidSaveError);
  });

  it("rejects version mismatch", () => {
    expect(() => validator.validateVersion(makeSave({ version: 99 }))).toThrow(
      VersionMismatchError,
    );
  });

  it("accepts matching version", () => {
    expect(() => validator.validateVersion(makeSave())).not.toThrow();
  });
});
