import type { GameBridgeState, InventoryVM } from "../../game/GameBridge";

export type InventoryModel = InventoryVM;

export function selectInventory(state: GameBridgeState): InventoryModel {
  return state.inventory;
}
