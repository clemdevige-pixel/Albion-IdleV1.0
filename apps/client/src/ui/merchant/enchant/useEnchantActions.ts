import { useCallback } from "react";
import type { ItemInstanceId } from "@game/gameplay";
import { useGameServices } from "../../../state/GameContext";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncWalletToBridge,
} from "../../../state/bridgeSync";

export function useEnchantActions(): {
  readonly enchant: (instanceId: string, incomeRate: number) => string | undefined;
} {
  const services = useGameServices();

  const enchant = useCallback((instanceId: string, incomeRate: number): string | undefined => {
    const transactionId = `tx_enchant_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`;
    const result = services.enchantmentService.enchant(
      instanceId as ItemInstanceId,
      transactionId,
    );
    if (!result.ok) {
      services.bridge.addEconomyNotification({
        id: `notif_${transactionId}`,
        type: "error",
        message: `Enchantement impossible : ${result.reason}`,
        timestamp: Date.now(),
      });
      return undefined;
    }

    services.bridge.addEconomyNotification({
      id: `notif_${transactionId}`,
      type: "success",
      message: `Enchantement réussi · .${String(result.toLevel)}`,
      timestamp: Date.now(),
    });
    syncInventoryToBridge(services.bridge, services.inventoryManager, services.heroId);
    syncEquipmentToBridge(services.bridge, services.equipmentManager, services.heroId);
    syncWalletToBridge(
      services.bridge,
      services.currencyService,
      services.walletId,
      incomeRate,
    );
    return result.instanceId;
  }, [services]);

  return { enchant };
}
