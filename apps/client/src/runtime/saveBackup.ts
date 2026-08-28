import {
  SerializationFailedError,
  type SaveFormat,
  type SaveRepository,
} from "@game/persistence";

export type SaveLoadSource = "primary" | "backup" | "backup_unrestored";

export interface BackupCurrentSaveOptions {
  /**
   * A normal autosave may safely continue without a backup: LocalStorage
   * replacements are atomic, so a failed primary write preserves the current
   * primary snapshot. Destructive flows such as imports must stay strict.
   */
  readonly continueWithoutBackupOnStorageFailure?: boolean;
}

/** Keeps the last readable primary snapshot before it is overwritten. */
export function backupCurrentSave(
  repository: SaveRepository,
  primarySlotId: string,
  backupSlotId: string,
  options: BackupCurrentSaveOptions = {},
): boolean {
  if (!repository.has(primarySlotId)) return false;

  const current = repository.get(primarySlotId);
  try {
    repository.save(backupSlotId, current);
    return true;
  } catch (error) {
    if (
      !(error instanceof SerializationFailedError)
      || options.continueWithoutBackupOnStorageFailure !== true
    ) {
      throw error;
    }

    // A stale full-size backup can prevent the newer primary from fitting at
    // all. The existing primary remains the recovery point until its atomic
    // replacement succeeds below in RuntimePersistence.save().
    if (repository.has(backupSlotId)) {
      repository.delete(backupSlotId);
    }
    console.error(
      "[Persistence] Backup rotation skipped because browser storage is full; continuing with the protected primary save:",
      error,
    );
    return false;
  }
}

/** Loads the primary slot, falling back to its backup if needed. */
export function loadSaveWithBackup(
  repository: SaveRepository,
  primarySlotId: string,
  backupSlotId: string,
  loadSlot: (slotId: string) => void,
): SaveLoadSource {
  try {
    loadSlot(primarySlotId);
    return "primary";
  } catch (primaryError) {
    if (!repository.has(backupSlotId)) throw primaryError;

    loadSlot(backupSlotId);
    const backup: SaveFormat = repository.get(backupSlotId);
    try {
      repository.save(primarySlotId, backup);
      return "backup";
    } catch (restoreError) {
      // The runtime has already loaded a validated backup. A storage write
      // failure must not turn that successful recovery into a failed load.
      console.error(
        "[Persistence] Backup loaded but primary restore could not be persisted:",
        restoreError,
      );
      return "backup_unrestored";
    }
  }
}
