import { useCallback } from "react";
import type { EquipmentSlot } from "@game/gameplay";
import { useGameServices } from "../../state/GameContext";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncStatsToBridge,
} from "../../state/bridgeSync";
import { syncCraftingProjection } from "../../state/production/ProductionBridgeAdapter";

interface CharacterActions {
  readonly equip: (inventoryPosition: number) => boolean;
  readonly unequip: (slot: EquipmentSlot) => boolean;
}

function notifyEquipmentFailure(
  services: ReturnType<typeof useGameServices>,
  reason: string,
): void {
  const message = reason === "equipment_locked"
    ? "Impossible de changer d'équipement pendant le combat. Utilisez « Arrêter le combat » : l'arrêt aura lieu à la fin du segment en cours."
    : reason === "two_handed_conflict"
      ? "Impossible d'équiper cet objet : une arme à deux mains occupe la main gauche."
      : reason === "inventory_full"
        ? "Impossible de changer cet équipement : l'inventaire n'a pas assez de place."
        : "Impossible de modifier cet équipement dans l'état actuel.";

  services.bridge.addEconomyNotification({
    id: `notif_equipment_failed_${String(Date.now())}`,
    type: "error",
    message,
    timestamp: Date.now(),
  });
}

/** Compatibility adapter for the current gameplay services. */
export function useCharacterActions(): CharacterActions {
  const services = useGameServices();

  const refreshCharacterState = useCallback(() => {
    const { bridge, equipmentManager, inventoryManager, statsManager, heroId, productionStorageId } = services;
    syncInventoryToBridge(bridge, inventoryManager, heroId);
    syncEquipmentToBridge(bridge, equipmentManager, heroId);
    syncStatsToBridge(bridge, statsManager, heroId);
    syncCraftingProjection(
      bridge,
      inventoryManager,
      heroId,
      productionStorageId,
      bridge.crafting.productionTier,
    );
  }, [services]);

  const equip = useCallback((inventoryPosition: number): boolean => {
    const result = services.equipmentManager.equipFromInventory(
      services.heroId,
      inventoryPosition,
    );
    if (result.ok) refreshCharacterState();
    else notifyEquipmentFailure(services, result.reason);
    return result.ok;
  }, [refreshCharacterState, services]);

  const unequip = useCallback((slot: EquipmentSlot): boolean => {
    const result = services.equipmentManager.unequipToInventory(services.heroId, slot);
    if (result.ok) refreshCharacterState();
    else notifyEquipmentFailure(services, result.reason);
    return result.ok;
  }, [refreshCharacterState, services]);

  return { equip, unequip };
}
