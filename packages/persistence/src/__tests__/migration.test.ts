import { describe, it, expect } from "vitest";
import { MigrationPipeline } from "../migration.js";
import { MigrationFailedError } from "../errors.js";
import { computeChecksum } from "../serializer.js";
import type { SaveFormat } from "../save-format.js";
import type { SaveMigration } from "../migration.js";

function makeSave(version: number, payload: Record<string, unknown>): SaveFormat {
  return {
    version,
    metadata: {
      version,
      createdAt: 0,
      updatedAt: 0,
      buildVersion: "0.1.0",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
  };
}

const v1to2: SaveMigration = {
  fromVersion: 1,
  toVersion: 2,
  migrate(save) {
    const payload = { ...save.payload, migrated12: true };
    return { ...save, version: 2, payload, checksum: computeChecksum(payload) };
  },
};

const v2to3: SaveMigration = {
  fromVersion: 2,
  toVersion: 3,
  migrate(save) {
    const payload = { ...save.payload, migrated23: true };
    return { ...save, version: 3, payload, checksum: computeChecksum(payload) };
  },
};

describe("MigrationPipeline", () => {
  it("chains migrations v1 -> v2 -> v3", () => {
    const pipeline = new MigrationPipeline();
    pipeline.register(v1to2);
    pipeline.register(v2to3);

    const result = pipeline.migrate(makeSave(1, { original: true }), 3);
    expect(result.version).toBe(3);
    expect(result.payload).toEqual({
      migrated12: true,
      migrated23: true,
      original: true,
    });
  });

  it("throws when migration path is incomplete", () => {
    const pipeline = new MigrationPipeline();
    pipeline.register(v1to2);

    expect(() => pipeline.migrate(makeSave(1, {}), 3)).toThrow(
      MigrationFailedError,
    );
  });

  it("returns unchanged if already at target", () => {
    const pipeline = new MigrationPipeline();
    const save = makeSave(3, { data: true });
    const result = pipeline.migrate(save, 3);
    expect(result).toBe(save);
  });
});
