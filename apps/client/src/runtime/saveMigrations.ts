import {
  MigrationPipeline,
  type SaveMigration,
} from "@game/persistence";

/**
 * Increment only when the persisted payload shape changes incompatibly.
 * A contiguous migration must be registered at the same time.
 */
export const CURRENT_RUNTIME_SAVE_VERSION = 1;
export const EARLIEST_SUPPORTED_RUNTIME_SAVE_VERSION = 1;

/** Ordered, explicit registry for future runtime save migrations. */
export const RUNTIME_SAVE_MIGRATIONS: readonly SaveMigration[] = [];

export interface RuntimeMigrationPipelineOptions {
  readonly currentVersion?: number;
  readonly earliestSupportedVersion?: number;
  readonly migrations?: readonly SaveMigration[];
}

/**
 * Builds a migration pipeline only when every supported version has a single
 * one-step path to the current version. This makes a forgotten migration fail
 * during startup/tests instead of failing later on a player's save.
 */
export function createRuntimeMigrationPipeline(
  options?: RuntimeMigrationPipelineOptions,
): MigrationPipeline {
  const currentVersion = options?.currentVersion
    ?? CURRENT_RUNTIME_SAVE_VERSION;
  const earliestSupportedVersion = options?.earliestSupportedVersion
    ?? EARLIEST_SUPPORTED_RUNTIME_SAVE_VERSION;
  const migrations = options?.migrations ?? RUNTIME_SAVE_MIGRATIONS;

  if (
    !Number.isInteger(currentVersion)
    || !Number.isInteger(earliestSupportedVersion)
    || currentVersion < 1
    || earliestSupportedVersion < 1
    || earliestSupportedVersion > currentVersion
  ) {
    throw new Error("Invalid runtime save migration version range");
  }

  const migrationsBySource = new Map<number, SaveMigration>();
  for (const migration of migrations) {
    if (migration.toVersion !== migration.fromVersion + 1) {
      throw new Error(
        `Runtime save migration v${String(migration.fromVersion)} must target the next version`,
      );
    }
    if (migrationsBySource.has(migration.fromVersion)) {
      throw new Error(
        `Duplicate runtime save migration from v${String(migration.fromVersion)}`,
      );
    }
    migrationsBySource.set(migration.fromVersion, migration);
  }

  const pipeline = new MigrationPipeline();
  for (
    let version = earliestSupportedVersion;
    version < currentVersion;
    version += 1
  ) {
    const migration = migrationsBySource.get(version);
    if (migration === undefined) {
      throw new Error(
        `Missing runtime save migration v${String(version)} -> v${String(version + 1)}`,
      );
    }
    pipeline.register(migration);
  }

  return pipeline;
}
