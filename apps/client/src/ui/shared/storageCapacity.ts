export type StorageCapacityState = "normal" | "warning" | "full";

export const STORAGE_NEAR_FULL_FREE_SLOTS = 2;

export interface StorageCapacitySnapshot {
  readonly freeSlots: number;
  readonly percent: number;
  readonly state: StorageCapacityState;
}

export function getStorageCapacitySnapshot(occupied: number, capacity: number): StorageCapacitySnapshot {
  const freeSlots = Math.max(0, capacity - occupied);
  const isFull = capacity > 0 && freeSlots === 0;
  const isNearlyFull = capacity > 0 && !isFull && freeSlots <= STORAGE_NEAR_FULL_FREE_SLOTS;
  return {
    freeSlots,
    percent: capacity === 0 ? 0 : Math.min(100, (occupied / capacity) * 100),
    state: isFull ? "full" : isNearlyFull ? "warning" : "normal",
  };
}
