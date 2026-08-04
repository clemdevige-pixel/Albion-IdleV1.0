import { MigrationFailedError } from "./errors.js";
import type { SaveFormat } from "./save-format.js";

export interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(save: SaveFormat): SaveFormat;
}

export class MigrationPipeline {
  private readonly migrations: SaveMigration[] = [];

  register(migration: SaveMigration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  migrate(save: SaveFormat, targetVersion: number): SaveFormat {
    let current = save;
    let version = current.version;

    while (version < targetVersion) {
      const migration = this.migrations.find((m) => m.fromVersion === version);
      if (migration === undefined) {
        throw new MigrationFailedError(version, targetVersion);
      }
      try {
        current = migration.migrate(current);
      } catch (err) {
        if (err instanceof MigrationFailedError) throw err;
        throw new MigrationFailedError(version, migration.toVersion, {
          cause: err,
        });
      }
      version = current.version;
    }

    return current;
  }
}
