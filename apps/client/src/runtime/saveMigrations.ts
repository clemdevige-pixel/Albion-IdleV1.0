import {
  computeChecksum,
  MigrationPipeline,
  type SaveFormat,
  type SaveMigration,
} from "@game/persistence";

/**
 * Increment only when the persisted payload shape changes incompatibly.
 * A contiguous migration must be registered at the same time.
 */
export const CURRENT_RUNTIME_SAVE_VERSION = 2;
export const EARLIEST_SUPPORTED_RUNTIME_SAVE_VERSION = 1;

const LEGACY_ID_RENAMES: Readonly<Record<string, string>> = {
  mastery_t4_fire_staff: "mastery_infernal_staff",
  item_weapon_staff_t3_fire: "item_weapon_staff_t3_infernal",
  item_weapon_staff_t4_fire: "item_weapon_staff_t4_infernal",
};

function migrateLegacyIds(value: unknown): unknown {
  if (typeof value === "string") {
    return LEGACY_ID_RENAMES[value] ?? value;
  }

  if (Array.isArray(value)) {
    return value.map(migrateLegacyIds);
  }

  if (value !== null && typeof value === "object") {
    const migrated: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      migrated[key] = migrateLegacyIds(child);
    }

    return migrated;
  }

  return value;
}

const migrateV1ToV2: SaveMigration = {
  fromVersion: 1,
  toVersion: 2,

  migrate(save: SaveFormat): SaveFormat {
    const payload = migrateLegacyIds(
      save.payload,
    ) as Record<string, unknown>;

    return {
      ...save,
      version: 2,
      metadata: {
        ...save.metadata,
        version: 2,
      },
      payload,
      checksum: computeChecksum(payload),
    };
  },
};

/** Ordered, explicit registry for runtime save migrations. */
export const RUNTIME_SAVE_MIGRATIONS: readonly SaveMigration[] = [
  migrateV1ToV2,
];

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