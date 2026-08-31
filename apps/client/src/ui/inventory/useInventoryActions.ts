import { useCallback, useMemo } from "react";
import { isRelicInventoryItem } from "../../data/relicContentCatalog";
import { getFragmentAssemblyRecipe } from "../../data/specialCraftRecipes.js";
import {
  StorageRuntime,
  type StorageKind,
  type StorageRange,
} from "../../runtime/StorageRuntime";
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
  readonly assembleFragments: (itemId: string) => boolean;
  readonly move: (storage: StorageKind, from: number, to: number) => boolean;
  readonly canMoveToRange: (storage: StorageKind, from: number, range: StorageRange) => boolean;
  readonly moveToRange: (storage: StorageKind, from: number, range: StorageRange) => boolean;
  readonly transfer: (fromStorage: StorageKind, from: number, toStorage: StorageKind, to?: number) => boolean;
  readonly canTransferToRange: (
    fromStorage: StorageKind,
    from: number,
    toStorage: StorageKind,
    range: StorageRange,
  ) => boolean;
  readonly transferToRange: (
    fromStorage: StorageKind,
    from: number,
    toStorage: StorageKind,
    range: StorageRange,
  ) => boolean;
  readonly sort: (storage: StorageKind, start?: number, length?: number) => boolean;
}

function equipmentFailureMessage(reason: string): string {
  switch (reason) {
    case "equipment_locked":
      return "Impossible de changer d'équipement pendant le combat. Utilisez « Arrêter le combat » : l'arrêt aura lieu à la fin du segment en cours.";
    case "two_handed_conflict":
      return "Impossible d'équiper cet objet : une arme à deux mains occupe la main gauche.";
    case "inventory_full":
      return "Impossible de changer cet équipement : l'inventaire n'a pas assez de place pour l'objet remplacé.";
    case "not_equippable":
      return "Cet objet ne peut pas être équipé.";
    default:
      return "Impossible d'équiper cet objet dans l'état actuel.";
  }
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

  const canTransferInventoryItemToBank = useCallback((position: number): boolean => {
    const slot = services.inventoryManager.getSlot(services.heroId, position);
    return slot.ok
      && slot.value.entry !== undefined
      && !isRelicInventoryItem(slot.value.entry.itemId);
  }, [services]);

  const equip = useCallback((position: number): boolean => {
    const result = services.equipmentManager.equipFromInventory(services.heroId, position);
    if (result.ok) {
      syncStorage();
      syncEquipmentToBridge(services.bridge, services.equipmentManager, services.heroId);
      syncStatsToBridge(services.bridge, services.statsManager, services.heroId);
    } else {
      services.bridge.addEconomyNotification({
        id: `notif_equip_failed_${String(Date.now())}`,
        type: "error",
        message: equipmentFailureMessage(result.reason),
        timestamp: Date.now(),
      });
    }
    return result.ok;
  }, [services, syncStorage]);

  const useConsumable = useCallback(
    (itemId: string): boolean => services.useConsumable(itemId),
    [services],
  );

  const assembleFragments = useCallback((itemId: string): boolean => {
    const recipe = getFragmentAssemblyRecipe(itemId);
    const requirement = recipe?.requirements[0];
    if (recipe === undefined || requirement === undefined) return false;

    const currentQuantity = services.inventoryManager.getAccessibleQuantity(services.heroId, itemId);
    if (currentQuantity < requirement.quantity) {
      services.bridge.addEconomyNotification({
        id: `notif_fragment_assembly_missing_${String(Date.now())}`,
        type: "error",
        message: `Fragments insuffisants : ${String(currentQuantity)} / ${String(requirement.quantity)} pour ${recipe.name}.`,
        timestamp: Date.now(),
      });
      return false;
    }

    const assembled = services.craftEquipment(recipe.outputItemId);
    if (!assembled) {
      services.bridge.addEconomyNotification({
        id: `notif_fragment_assembly_failed_${String(Date.now())}`,
        type: "error",
        message: `Impossible d’assembler ${recipe.name}. Vérifiez l’espace disponible dans l’inventaire ou la banque.`,
        timestamp: Date.now(),
      });
    }
    return assembled;
  }, [services]);

  const move = useCallback((kind: StorageKind, from: number, to: number): boolean => {
    const result = storage.moveWithin(kind, from, to);
    if (result.ok) syncStorage();
    return result.ok;
  }, [storage, syncStorage]);

  const canMoveToRange = useCallback((
    kind: StorageKind,
    from: number,
    range: StorageRange,
  ): boolean => storage.canMoveWithinRange(kind, from, range), [storage]);

  const moveToRange = useCallback((
    kind: StorageKind,
    from: number,
    range: StorageRange,
  ): boolean => {
    const result = storage.moveWithinRange(kind, from, range);
    if (result.ok) syncStorage();
    return result.ok;
  }, [storage, syncStorage]);

  const transfer = useCallback((fromKind: StorageKind, from: number, toKind: StorageKind, to?: number): boolean => {
    if (fromKind === "inventory" && toKind === "bank" && !canTransferInventoryItemToBank(from)) {
      return false;
    }
    const result = storage.transfer(fromKind, from, toKind, to);
    if (result.ok) syncStorage();
    return result.ok;
  }, [canTransferInventoryItemToBank, storage, syncStorage]);

  const canTransferToRange = useCallback((
    fromKind: StorageKind,
    from: number,
    toKind: StorageKind,
    range: StorageRange,
  ): boolean => {
    if (fromKind === "inventory" && toKind === "bank" && !canTransferInventoryItemToBank(from)) {
      return false;
    }
    return storage.canTransferToRange(fromKind, from, toKind, range);
  }, [canTransferInventoryItemToBank, storage]);

  const transferToRange = useCallback((
    fromKind: StorageKind,
    from: number,
    toKind: StorageKind,
    range: StorageRange,
  ): boolean => {
    if (fromKind === "inventory" && toKind === "bank" && !canTransferInventoryItemToBank(from)) {
      return false;
    }
    const result = storage.transferToRange(fromKind, from, toKind, range);
    if (result.ok) syncStorage();
    return result.ok;
  }, [canTransferInventoryItemToBank, storage, syncStorage]);

  const sort = useCallback((kind: StorageKind, start?: number, length?: number): boolean => {
    const range = start === undefined || length === undefined ? undefined : { start, length };
    const result = storage.sort(kind, range);
    if (result.ok) syncStorage();
    return result.ok;
  }, [storage, syncStorage]);

  return {
    equip,
    useConsumable,
    assembleFragments,
    move,
    canMoveToRange,
    moveToRange,
    transfer,
    canTransferToRange,
    transferToRange,
    sort,
  };
}
