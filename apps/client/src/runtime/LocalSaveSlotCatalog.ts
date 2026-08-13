import { LocalStorageSaveRepository, type SaveRepository } from "@game/persistence";
import {
  LEGACY_SAVE_SLOT_ID,
  PLAYER_SAVE_SLOT_IDS,
  getAccountSaveSlotId,
  getSaveBackupSlotId,
  getSaveSlotNumber,
  type PlayerSaveSlotId,
} from "./saveSlots";

export interface LocalSaveSlotSummary {
  readonly id: PlayerSaveSlotId;
  readonly number: number;
  readonly label: string;
  readonly hasSave: boolean;
}

interface MigrationMarkerStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const LEGACY_MIGRATION_MARKER = "albion_idle_slot_migration_v1";
const ACCOUNT_SLOT_CLAIM_MARKER = "albion_idle_account_slot_claim_v1";
const ACCOUNT_MIGRATION_MARKER_PREFIX = "albion_idle_account_slot_migration_v1_";

function getBrowserStorage(): Storage | undefined {
  return typeof globalThis !== "undefined" && "localStorage" in globalThis
    ? globalThis.localStorage
    : undefined;
}

/** Manages local slot identity only; RuntimePersistence owns save validation. */
export class LocalSaveSlotCatalog {
  public constructor(
    private readonly accountId: string,
    private readonly repository: SaveRepository = new LocalStorageSaveRepository(),
    private readonly markerStore: MigrationMarkerStore | undefined = getBrowserStorage(),
  ) {}

  public migrateLocalSavesToAccount(): boolean {
    const accountMigrationMarker = `${ACCOUNT_MIGRATION_MARKER_PREFIX}${this.accountId}`;
    if (this.markerStore?.getItem(accountMigrationMarker) === "done") return false;

    this.migrateLegacySaveToFirstUnscopedSlot();

    const claimedBy = this.markerStore?.getItem(ACCOUNT_SLOT_CLAIM_MARKER);
    if (claimedBy !== null && claimedBy !== this.accountId) {
      this.markerStore?.setItem(accountMigrationMarker, "done");
      return false;
    }

    let migrated = false;
    for (const logicalSlotId of PLAYER_SAVE_SLOT_IDS) {
      const accountSlotId = getAccountSaveSlotId(this.accountId, logicalSlotId);
      const sourceBackupId = getSaveBackupSlotId(logicalSlotId);
      const accountBackupId = getSaveBackupSlotId(accountSlotId);
      if (!this.repository.has(accountSlotId) && this.repository.has(logicalSlotId)) {
        this.repository.save(accountSlotId, this.repository.get(logicalSlotId));
        migrated = true;
      }
      if (!this.repository.has(accountBackupId) && this.repository.has(sourceBackupId)) {
        this.repository.save(accountBackupId, this.repository.get(sourceBackupId));
        migrated = true;
      }
    }
    if (migrated || claimedBy === null) {
      this.markerStore?.setItem(ACCOUNT_SLOT_CLAIM_MARKER, this.accountId);
    }
    this.markerStore?.setItem(accountMigrationMarker, "done");
    return migrated;
  }

  private migrateLegacySaveToFirstUnscopedSlot(): boolean {
    if (this.markerStore?.getItem(LEGACY_MIGRATION_MARKER) === "done") return false;

    const destinationId = PLAYER_SAVE_SLOT_IDS[0];
    const destinationBackupId = getSaveBackupSlotId(destinationId);
    if (this.hasSave(destinationId)) {
      this.markLegacyMigrationDone();
      return false;
    }

    const legacyBackupId = getSaveBackupSlotId(LEGACY_SAVE_SLOT_ID);
    let migrated = false;
    if (this.repository.has(LEGACY_SAVE_SLOT_ID)) {
      this.repository.save(destinationId, this.repository.get(LEGACY_SAVE_SLOT_ID));
      migrated = true;
    }
    if (this.repository.has(legacyBackupId)) {
      this.repository.save(destinationBackupId, this.repository.get(legacyBackupId));
      migrated = true;
    }
    if (migrated) this.markLegacyMigrationDone();
    return migrated;
  }

  public listSlots(): readonly LocalSaveSlotSummary[] {
    return PLAYER_SAVE_SLOT_IDS.map((id) => {
      const number = getSaveSlotNumber(id);
      return { id, number, label: `Partie ${String(number)}`, hasSave: this.hasSave(this.resolve(id)) };
    });
  }

  public deleteSlot(slotId: PlayerSaveSlotId): void {
    const storageId = this.resolve(slotId);
    const backupId = getSaveBackupSlotId(storageId);
    if (this.repository.has(storageId)) this.repository.delete(storageId);
    if (this.repository.has(backupId)) this.repository.delete(backupId);
  }

  public getStorageSlotId(slotId: PlayerSaveSlotId): string {
    return this.resolve(slotId);
  }

  private hasSave(slotId: string): boolean {
    return this.repository.has(slotId) || this.repository.has(getSaveBackupSlotId(slotId));
  }

  private markLegacyMigrationDone(): void {
    this.markerStore?.setItem(LEGACY_MIGRATION_MARKER, "done");
  }

  private resolve(slotId: PlayerSaveSlotId): string {
    return getAccountSaveSlotId(this.accountId, slotId);
  }
}
