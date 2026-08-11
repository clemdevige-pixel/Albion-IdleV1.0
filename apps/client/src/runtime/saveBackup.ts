import type { SaveFormat, SaveRepository } from "@game/persistence";

export type SaveLoadSource = "primary" | "backup";

/** Keeps the last readable primary snapshot before it is overwritten. */
export function backupCurrentSave(
  repository: SaveRepository,
  primarySlotId: string,
  backupSlotId: string,
): boolean {
  if (!repository.has(primarySlotId)) return false;

  const current = repository.get(primarySlotId);
  repository.save(backupSlotId, current);
  return true;
}

/** Loads the primary slot, falling back to and restoring its backup if needed. */
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
    repository.save(primarySlotId, backup);
    return "backup";
  }
}
