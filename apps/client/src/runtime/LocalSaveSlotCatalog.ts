import { LocalStorageSaveRepository, type SaveRepository } from "@game/persistence";
import {
  LEGACY_SAVE_SLOT_ID,
  PLAYER_SAVE_SLOT_IDS,
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

function getBrowserStorage(): Storage | undefined {
  return typeof globalThis !== "undefined" && "localStorage" in globalThis
    ? globalThis.localStorage
    : undefined;
}

/** Manages local slot identity only; RuntimePersistence owns save validation. */
export class LocalSaveSlotCatalog {
  public constructor(
    private readonly repository: SaveRepository = new LocalStorageSaveRepository(),
    private readonly markerStore: MigrationMarkerStore | undefined = getBrowserStorage(),
  ) {}

  public migrateLegacySaveToFirstSlot(): boolean {
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
      return { id, number, label: `Partie ${String(number)}`, hasSave: this.hasSave(id) };
    });
  }

  public deleteSlot(slotId: PlayerSaveSlotId): void {
    const backupId = getSaveBackupSlotId(slotId);
    if (this.repository.has(slotId)) this.repository.delete(slotId);
    if (this.repository.has(backupId)) this.repository.delete(backupId);
  }

  private hasSave(slotId: PlayerSaveSlotId): boolean {
    return this.repository.has(slotId) || this.repository.has(getSaveBackupSlotId(slotId));
  }

  private markLegacyMigrationDone(): void {
    this.markerStore?.setItem(LEGACY_MIGRATION_MARKER, "done");
  }
}
