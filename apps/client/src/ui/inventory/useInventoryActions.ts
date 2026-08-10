import { useCallback, useMemo } from "react";
import { StorageRuntime, type StorageKind } from "../../runtime/StorageRuntime";
import { useGameServices } from "../../state/GameContext";
import {
  syncBankToBridge,
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncStatsToBridge,
} from "../../state/bridgeSync";

interface InventoryActions {
  readonly equip: (position: number) => boolean;
  readonly useConsumable: (itemId: string) => boolean;
  readonly move: (storage: StorageKind, from: number, to: number) => boolean;
  readonly transfer: (fromStorage: StorageKind, from: number, toStorage: StorageKind, to?: number) => boolean;
  readonly sort: (storage: StorageKind) => boolean;
}

export function useInventoryActions(): InventoryActions {
  const services = useGameServices();
  const storage = useMemo(
    () => new StorageRuntime(services.inventoryManager, services.heroId, services.bankId),
    [services],
  );

  const syncStorage = useCallback((): void => {
    syncInventoryToBridge(services.bridge, services.inventoryManager, services.heroId);
    syncBankToBridge(services.bridge, services.inventoryManager, services.bankId);
  }, [services]);

  const equip = useCallback((position: number): boolean => {
    const result = services.equipmentManager.equipFromInventory(services.heroId, position);
    if (result.ok) {
      syncStorage();
      syncEquipmentToBridge(services.bridge, services.equipmentManager, services.heroId);
      syncStatsToBridge(services.bridge, services.statsManager, services.heroId);
    }
    return result.ok;
  }, [services, syncStorage]);

  const useConsumable = useCallback(
    (itemId: string): boolean => services.useConsumable(itemId),
    [services],
  );

  const move = useCallback((kind: StorageKind, from: number, to: number): boolean => {
    const result = storage.moveWithin(kind, from, to);
    if (result.ok) syncStorage();
    return result.ok;
  }, [storage, syncStorage]);

  const transfer = useCallback((fromKind: StorageKind, from: number, toKind: StorageKind, to?: number): boolean => {
    const result = storage.transfer(fromKind, from, toKind, to);
    if (result.ok) syncStorage();
    return result.ok;
  }, [storage, syncStorage]);

  const sort = useCallback((kind: StorageKind): boolean => {
    const result = storage.sort(kind);
    if (result.ok) syncStorage();
    return result.ok;
  }, [storage, syncStorage]);

  return { equip, useConsumable, move, transfer, sort };
}
