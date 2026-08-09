import { useCallback } from "react";
import { useGameServices } from "../../state/GameContext";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncStatsToBridge,
} from "../../state/bridgeSync";

interface InventoryActions {
  readonly equip: (position: number) => boolean;
  readonly useConsumable: (itemId: string) => boolean;
}

/** Compatibility adapter: gameplay remains authoritative. */
export function useInventoryActions(): InventoryActions {
  const services = useGameServices();

  const equip = useCallback((position: number): boolean => {
    const result = services.equipmentManager.equipFromInventory(
      services.heroId,
      position,
    );
    if (result.ok) {
      syncInventoryToBridge(services.bridge, services.inventoryManager, services.heroId);
      syncEquipmentToBridge(services.bridge, services.equipmentManager, services.heroId);
      syncStatsToBridge(services.bridge, services.statsManager, services.heroId);
    }
    return result.ok;
  }, [services]);

  const useConsumable = useCallback(
    (itemId: string): boolean => services.useConsumable(itemId),
    [services],
  );

  return { equip, useConsumable };
}
