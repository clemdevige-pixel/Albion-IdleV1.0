import { useCallback } from "react";
import { asEconomyTransactionId } from "@game/gameplay";
import { getItemDisplayName } from "../../../panels/ItemVisual";
import { isProductionMaterial } from "../../../runtime/ProductionStorage";
import { useGameServices } from "../../../state/GameContext";
import {
  syncBankToBridge,
  syncInventoryToBridge,
  syncWalletToBridge,
} from "../../../state/bridgeSync";

export type VendorTransactionDirection = "buy" | "sell";

export interface VendorTransactionRequest {
  readonly vendorId: string;
  readonly direction: VendorTransactionDirection;
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly incomeRate: number;
}

export function useVendorTransactionExecutor(): (
  request: VendorTransactionRequest,
) => boolean {
  const services = useGameServices();

  return useCallback((request: VendorTransactionRequest): boolean => {
    const transactionId = asEconomyTransactionId(
      `tx_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
    );
    const isPurchase = request.direction === "buy";
    const targetEntityId = isPurchase && isProductionMaterial(request.itemId)
      ? services.productionStorageId
      : services.heroId;
    const result = services.economyTransactionService.execute({
      type: isPurchase ? "vendor_purchase" : "vendor_sale",
      transactionId,
      playerId: services.playerId,
      playerEntityId: targetEntityId,
      walletId: services.walletId,
      vendorId: request.vendorId,
      itemId: request.itemId,
      quantity: request.quantity,
    });

    if (!result.ok) {
      services.bridge.addEconomyNotification({
        id: `notif_${transactionId}`,
        type: "error",
        message: `Transaction impossible : ${result.code}`,
        timestamp: Date.now(),
      });
      return false;
    }

    const total = request.unitPrice * request.quantity;
    services.bridge.addTransaction({
      id: transactionId,
      type: isPurchase ? "purchase" : "sale",
      description: `${isPurchase ? "Achat" : "Vente"} : ${getItemDisplayName(request.itemId)} ×${String(request.quantity)}`,
      amount: total,
      timestamp: Date.now(),
    });
    services.bridge.addEconomyNotification({
      id: `notif_${transactionId}`,
      type: "success",
      message: `${isPurchase ? "Achat" : "Vente"} · ${String(request.quantity)} × ${getItemDisplayName(request.itemId)} · ${String(total)} Silver`,
      timestamp: Date.now(),
    });
    syncInventoryToBridge(services.bridge, services.inventoryManager, services.heroId);
    syncBankToBridge(services.bridge, services.inventoryManager, services.bankId);
    syncWalletToBridge(
      services.bridge,
      services.currencyService,
      services.walletId,
      request.incomeRate,
    );
    return true;
  }, [services]);
}
