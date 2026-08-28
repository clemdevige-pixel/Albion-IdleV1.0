import type { SaveRepository } from "@game/persistence";

const BACKUP_SUFFIX = "_backup";

/**
 * Frees quota only from redundant backup snapshots. A backup is reclaimable
 * only when its matching primary still exists. Backup-only recovery points and
 * the current slot backup are always preserved.
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
    if (primarySlotId.length === 0 || !repository.has(primarySlotId)) continue;

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
