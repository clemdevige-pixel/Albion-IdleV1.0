import type { InventorySlotVM } from "../../game/GameBridge";

export function findFirstEmptyBankTabPosition(
  slots: readonly InventorySlotVM[],
  tabNumber: number,
  tabCapacity: number,
): number | undefined {
  if (!Number.isInteger(tabNumber) || tabNumber < 1 || !Number.isInteger(tabCapacity) || tabCapacity <= 0) {
    return undefined;
  }
  const start = (tabNumber - 1) * tabCapacity;
  const end = start + tabCapacity;
  return slots.find((slot) => (
    slot.position >= start
    && slot.position < end
    && slot.itemId === undefined
  ))?.position;
}
