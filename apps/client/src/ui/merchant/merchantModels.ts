import type {
  EquipmentVM,
  GameBridgeState,
  InventoryVM,
  RepairVM,
  VendorVM,
  WalletVM,
} from "../../game/GameBridge";

export type MerchantServiceId = "buy" | "black_market" | "enchant" | "repair";

export interface MerchantSnapshot {
  readonly wallet: WalletVM;
  readonly vendor: VendorVM;
  readonly inventory: InventoryVM;
  readonly bank: InventoryVM;
  readonly equipment: EquipmentVM;
  readonly repair: RepairVM;
}

export function selectMerchantSnapshot(state: GameBridgeState): MerchantSnapshot {
  return {
    wallet: state.wallet,
    vendor: state.vendor,
    inventory: state.inventory,
    bank: state.bank,
    equipment: state.equipment,
    repair: state.repair,
  };
}

export function getOwnedItemTotals(inventory: InventoryVM): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const slot of inventory.slots) {
    if (slot.itemId !== undefined) {
      totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.quantity);
    }
  }
  return totals;
}
