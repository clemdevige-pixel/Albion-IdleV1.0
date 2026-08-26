import type { SaveRepository } from "./save-repository.js";
import type { SaveFormat, SaveMetadata } from "./save-format.js";
import { SnapshotBuilder } from "./snapshot-builder.js";
import { SnapshotLoader } from "./snapshot-loader.js";
import { SaveValidator } from "./save-validator.js";
import type { VersionManager } from "./version-manager.js";
import type { MigrationPipeline } from "./migration.js";
import { serialize, computeChecksum } from "./serializer.js";
import { deserialize } from "./deserializer.js";
import type { SaveProvider } from "./save-provider.js";

export interface SaveManagerOptions {
  readonly repository: SaveRepository;
  readonly versionManager: VersionManager;
  readonly migrationPipeline: MigrationPipeline;
  readonly buildVersion: string;
  readonly seed: number;
}

export class SaveManager {
  private readonly repository: SaveRepository;
  private readonly versionManager: VersionManager;
  private readonly migrationPipeline: MigrationPipeline;
  private readonly validator: SaveValidator;
  private readonly builder: SnapshotBuilder;
  private readonly loader: SnapshotLoader;
  private readonly buildVersion: string;
  private readonly seed: number;

  constructor(options: SaveManagerOptions) {
    this.repository = options.repository;
    this.versionManager = options.versionManager;
    this.migrationPipeline = options.migrationPipeline;
    this.validator = new SaveValidator(options.versionManager.currentVersion);
    this.builder = new SnapshotBuilder();
    this.loader = new SnapshotLoader();
    this.buildVersion = options.buildVersion;
    this.seed = options.seed;
  }

  registerProvider(provider: SaveProvider): void {
    this.builder.register(provider);
    this.loader.register(provider);
  }

  save(id: string, _tick: number, extra?: Readonly<Record<string, unknown>>): void {
    const payload = this.builder.build();
    const checksum = computeChecksum(payload);

    const existing = this.repository.has(id)
      ? this.repository.get(id)
      : undefined;
    // Save metadata is also used to reconcile browser and cloud copies. A
    // runtime tick restarts at zero for every session, so it cannot establish
    // which copy was saved most recently across devices or reloads.
    const now = Math.max(
      Date.now(),
      (existing?.metadata.updatedAt ?? 0) + 1,
    );

    const metadata: SaveMetadata = {
      version: this.versionManager.currentVersion,
      createdAt: existing?.metadata.createdAt ?? now,
      updatedAt: now,
      buildVersion: this.buildVersion,
      seed: this.seed,
      ...(extra === undefined ? {} : { extra: { ...extra } }),
    };

    const saveData: SaveFormat = {
      version: this.versionManager.currentVersion,
      metadata,
      payload,
      checksum,
    };

    const raw = serialize(saveData);
    const deserialized = deserialize(raw);
    this.repository.save(id, deserialized);
  }

  load(id: string): void {
    const save = this.prepareSave(this.repository.get(id));
    const previousPayload = this.builder.build();

    try {
      this.loader.load(save.payload);
    } catch (error) {
      try {
        this.loader.load(previousPayload);
      } catch (rollbackError) {
        const rollbackReason = rollbackError instanceof Error
          ? rollbackError.message
          : String(rollbackError);
        throw new Error(
          `Save load failed and runtime rollback also failed: ${rollbackReason}`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  /** Returns a validated, portable representation of an existing save. */
  exportSave(id: string): string {
    return serialize(this.prepareSave(this.repository.get(id)));
  }

  /** Validates an imported save completely before replacing the target slot. */
  importSave(id: string, raw: string): void {
    const save = this.prepareSave(deserialize(raw));
    this.repository.save(id, save);
  }

  list(): string[] {
    return this.repository.list();
  }

  delete(id: string): void {
    this.repository.delete(id);
  }

  has(id: string): boolean {
    return this.repository.has(id);
  }

  private prepareSave(raw: SaveFormat): SaveFormat {
    this.validator.validateFormat(raw);
    this.validator.validateChecksum(raw);

    const save = this.versionManager.isOld(raw.version)
      ? this.migrationPipeline.migrate(
        raw,
        this.versionManager.currentVersion,
      )
      : raw;

    this.validator.validateFormat(save);
    this.validator.validateChecksum(save);
    this.validator.validateVersion(save);
    return save;
  }
}
