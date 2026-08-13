export const LEGACY_SAVE_SLOT_ID = "albion_idle_save_v1";

export const PLAYER_SAVE_SLOT_IDS = [
  "player_slot_1",
  "player_slot_2",
  "player_slot_3",
] as const;

export type PlayerSaveSlotId = (typeof PLAYER_SAVE_SLOT_IDS)[number];

export function getSaveBackupSlotId(slotId: string): string {
  return `${slotId}_backup`;
}

export function getSaveSlotNumber(slotId: PlayerSaveSlotId): number {
  return PLAYER_SAVE_SLOT_IDS.indexOf(slotId) + 1;
}

/** Storage identity for a logical slot owned by one authenticated account. */
export function getAccountSaveSlotId(accountId: string, slotId: PlayerSaveSlotId): string {
  return `account_${accountId}_${slotId}`;
}
