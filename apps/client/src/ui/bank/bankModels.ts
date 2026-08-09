import type { GameBridgeState, InventoryVM } from "../../game/GameBridge";

export type BankModel = InventoryVM;

export function selectBank(state: GameBridgeState): BankModel {
  return state.bank;
}
