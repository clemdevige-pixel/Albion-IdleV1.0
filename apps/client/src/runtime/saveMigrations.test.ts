import { computeChecksum, type SaveFormat, type SaveMigration } from "@game/persistence";
import { describe, expect, it } from "vitest";
import {
  CURRENT_RUNTIME_SAVE_VERSION,
  createRuntimeMigrationPipeline,
} from "./saveMigrations";

function makeSave(version: number): SaveFormat {
  const payload = { value: version };
  return {
    version,
    metadata: {
      version,
      createdAt: 0,
      updatedAt: 0,
      buildVersion: "test",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
  };
}

function makeMigration(fromVersion: number): SaveMigration {
  return {
    fromVersion,
    toVersion: fromVersion + 1,
    migrate(save) {
      const payload = { ...save.payload, value: fromVersion + 1 };
      return {
        ...save,
        version: fromVersion + 1,
        metadata: { ...save.metadata, version: fromVersion + 1 },
        payload,
        checksum: computeChecksum(payload),
      };
    },
  };
}

describe("runtime save migration registry", () => {
  it("keeps the current live format at version 1", () => {
    expect(CURRENT_RUNTIME_SAVE_VERSION).toBe(1);
    const pipeline = createRuntimeMigrationPipeline();
    const save = makeSave(1);
    expect(pipeline.migrate(save, 1)).toBe(save);
  });

  it("builds a complete contiguous migration path", () => {
    const pipeline = createRuntimeMigrationPipeline({
      currentVersion: 3,
      earliestSupportedVersion: 1,
      migrations: [makeMigration(1), makeMigration(2)],
    });

    expect(pipeline.migrate(makeSave(1), 3).version).toBe(3);
  });

  it("rejects a version bump with a missing migration", () => {
    expect(() => createRuntimeMigrationPipeline({
      currentVersion: 3,
      earliestSupportedVersion: 1,
      migrations: [makeMigration(1)],
    })).toThrow("Missing runtime save migration v2 -> v3");
  });

  it("rejects migrations that skip versions", () => {
    const invalid: SaveMigration = {
      fromVersion: 1,
      toVersion: 3,
      migrate: (save) => save,
    };

    expect(() => createRuntimeMigrationPipeline({
      currentVersion: 3,
      earliestSupportedVersion: 1,
      migrations: [invalid],
    })).toThrow("must target the next version");
  });
});
