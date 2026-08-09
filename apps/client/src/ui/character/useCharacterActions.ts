import { useCallback } from "react";
import type { EquipmentSlot } from "@game/gameplay";
import { useGameServices } from "../../state/GameContext";
import {
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncStatsToBridge,
} from "../../state/bridgeSync";

interface CharacterActions {
  readonly equip: (inventoryPosition: number) => boolean;
  readonly unequip: (slot: EquipmentSlot) => boolean;
}

/** Compatibility adapter for the current gameplay services. */
export function useCharacterActions(): CharacterActions {
  const services = useGameServices();

  const refreshCharacterState = useCallback(() => {
    const { bridge, equipmentManager, inventoryManager, statsManager, heroId } = services;
    syncInventoryToBridge(bridge, inventoryManager, heroId);
    syncEquipmentToBridge(bridge, equipmentManager, heroId);
    syncStatsToBridge(bridge, statsManager, heroId);
  }, [services]);

  const equip = useCallback((inventoryPosition: number): boolean => {
    const result = services.equipmentManager.equipFromInventory(
      services.heroId,
      inventoryPosition,
    );
    if (result.ok) refreshCharacterState();
    return result.ok;
  }, [refreshCharacterState, services]);

  const unequip = useCallback((slot: EquipmentSlot): boolean => {
    const result = services.equipmentManager.unequipToInventory(services.heroId, slot);
    if (result.ok) refreshCharacterState();
    return result.ok;
  }, [refreshCharacterState, services]);

  return { equip, unequip };
}
