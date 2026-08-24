import { LEGACY_FACTION_RUNE_MIGRATIONS } from "@game/data";
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
export const CURRENT_RUNTIME_SAVE_VERSION = 5;
export const EARLIEST_SUPPORTED_RUNTIME_SAVE_VERSION = 1;

const LEGACY_ID_RENAMES: Readonly<Record<string, string>> = {
  mastery_t4_fire_staff: "mastery_infernal_staff",
  item_weapon_staff_t3_fire: "item_weapon_staff_t3_infernal",
  item_weapon_staff_t4_fire: "item_weapon_staff_t4_infernal",
};

const LEGACY_FACTION_RELIC_ITEM_IDS = new Set([
  "item_relic_keeper",
  "item_relic_heretic",
  "item_relic_undead",
  "item_relic_morgana",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function migrateStringIds(value: unknown, migrations: Readonly<Record<string, string>>): unknown {
  if (typeof value === "string") return migrations[value] ?? value;
  if (Array.isArray(value)) return value.map((entry) => migrateStringIds(entry, migrations));
  if (isRecord(value)) {
    const migrated: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      migrated[key] = migrateStringIds(child, migrations);
    }
    return migrated;
  }
  return value;
}

function migrateLegacyIds(value: unknown): unknown {
  return migrateStringIds(value, LEGACY_ID_RENAMES);
}

function migrateLegacyDungeonKeyId(value: string): string {
  if (/^item_resource_dungeon_key_(?!t\d+$)[a-z0-9_]+$/.test(value)) {
    return "item_resource_dungeon_key_t4";
  }
  if (/^item_resource_key_fragment_[a-z0-9_]+$/.test(value)) {
    return "item_resource_dungeon_key_fragment_t4";
  }
  return value;
}

function migrateLegacyDungeonKeys(value: unknown): unknown {
  if (typeof value === "string") return migrateLegacyDungeonKeyId(value);
  if (Array.isArray(value)) return value.map(migrateLegacyDungeonKeys);
  if (isRecord(value)) {
    const migrated: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      migrated[key] = migrateLegacyDungeonKeys(child);
    }
    return migrated;
  }
  return value;
}

function removeLegacyFactionRelicItems(payload: Record<string, unknown>): Record<string, unknown> {
  const inventoryPayload = payload.inventory;
  if (!isRecord(inventoryPayload)) return payload;

  const inventories = inventoryPayload.inventories;
  if (!Array.isArray(inventories)) return payload;
  const savedInventories: readonly unknown[] = inventories;

  const migratedInventories = savedInventories.map((inventory): unknown => {
    if (!isRecord(inventory)) return inventory;
    const slots = inventory.slots;
    if (!Array.isArray(slots)) return inventory;
    const savedSlots: readonly unknown[] = slots;

    return {
      ...inventory,
      slots: savedSlots.filter((slot) => {
        if (!isRecord(slot)) return true;
        const itemId = slot.itemId;
        return typeof itemId !== "string" || !LEGACY_FACTION_RELIC_ITEM_IDS.has(itemId);
      }),
    };
  });

  return {
    ...payload,
    inventory: {
      ...inventoryPayload,
      inventories: migratedInventories,
    },
  };
}

const migrateV1ToV2: SaveMigration = {
  fromVersion: 1,
  toVersion: 2,
  migrate(save: SaveFormat): SaveFormat {
    const payload = migrateLegacyIds(save.payload) as Record<string, unknown>;
    return {
      ...save,
      version: 2,
      metadata: { ...save.metadata, version: 2 },
      payload,
      checksum: computeChecksum(payload),
    };
  },
};

const migrateV2ToV3: SaveMigration = {
  fromVersion: 2,
  toVersion: 3,
  migrate(save: SaveFormat): SaveFormat {
    const payload = migrateLegacyDungeonKeys(save.payload) as Record<string, unknown>;
    return {
      ...save,
      version: 3,
      metadata: { ...save.metadata, version: 3 },
      payload,
      checksum: computeChecksum(payload),
    };
  },
};

const migrateV3ToV4: SaveMigration = {
  fromVersion: 3,
  toVersion: 4,
  migrate(save: SaveFormat): SaveFormat {
    const payload = removeLegacyFactionRelicItems(save.payload);
    return {
      ...save,
      version: 4,
      metadata: { ...save.metadata, version: 4 },
      payload,
      checksum: computeChecksum(payload),
    };
  },
};

const migrateV4ToV5: SaveMigration = {
  fromVersion: 4,
  toVersion: 5,
  migrate(save: SaveFormat): SaveFormat {
    const payload = migrateStringIds(
      save.payload,
      LEGACY_FACTION_RUNE_MIGRATIONS,
    ) as Record<string, unknown>;
    return {
      ...save,
      version: 5,
      metadata: { ...save.metadata, version: 5 },
      payload,
      checksum: computeChecksum(payload),
    };
  },
};

/** Ordered, explicit registry for runtime save migrations. */
export const RUNTIME_SAVE_MIGRATIONS: readonly SaveMigration[] = [
  migrateV1ToV2,
  migrateV2ToV3,
  migrateV3ToV4,
  migrateV4ToV5,
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
  const currentVersion = options?.currentVersion ?? CURRENT_RUNTIME_SAVE_VERSION;
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
