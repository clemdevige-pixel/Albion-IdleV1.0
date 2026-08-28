import { SaveValidator, type SaveFormat, type SaveRepository } from "@game/persistence";

const BACKUP_SUFFIX = "_backup";

function getValidatedSave(repository: SaveRepository, slotId: string): SaveFormat | undefined {
  if (!repository.has(slotId)) return undefined;
  try {
    const save = repository.get(slotId);
    new SaveValidator(save.version).validate(save);
    return save;
  } catch {
    return undefined;
  }
}

/**
 * Frees quota only from backups proven redundant with their matching primary.
 * A backup is reclaimable only when both snapshots validate and carry the same
 * payload checksum. Mere primary existence is not sufficient because a
 * structurally present primary may still be the corrupted snapshot that forced
 * backup recovery. Backup-only recovery points and the current slot backup are
 * always preserved.
 */
export function reclaimRedundantSaveBackups(
  repository: SaveRepository,
  protectedBackupSlotId: string,
): readonly string[] {
  const reclaimed: string[] = [];

  for (const slotId of repository.list()) {
    if (slotId === protectedBackupSlotId || !slotId.endsWith(BACKUP_SUFFIX)) {
      continue;
    }

    const primarySlotId = slotId.slice(0, -BACKUP_SUFFIX.length);
    if (primarySlotId.length === 0) continue;

    const primary = getValidatedSave(repository, primarySlotId);
    const backup = getValidatedSave(repository, slotId);
    if (primary === undefined || backup === undefined) continue;
    if (primary.checksum !== backup.checksum) continue;

    try {
      repository.delete(slotId);
      reclaimed.push(slotId);
    } catch (error) {
      console.error(
        `[Persistence] Failed to reclaim redundant backup '${slotId}':`,
        error,
      );
    }
  }

  return reclaimed;
}
