import type { RepairVM, WalletVM } from "../../../game/GameBridge";

export interface RepairModel {
  readonly items: RepairVM["items"];
  readonly totalCost: number;
  readonly silver: number;
  readonly canRepairAll: boolean;
}

export function buildRepairModel(repair: RepairVM, wallet: WalletVM): RepairModel {
  return {
    items: repair.items,
    totalCost: repair.totalCost,
    silver: wallet.silver,
    canRepairAll: repair.totalCost > 0 && wallet.silver >= repair.totalCost,
  };
}
