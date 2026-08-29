import { useCallback } from "react";
import type { EquipmentLoadout, EquipmentSlot, InventoryEntry } from "@game/gameplay";
import { useGameServices } from "../../state/GameContext";
import { syncBankToBridge, syncEquipmentToBridge, syncInventoryToBridge, syncStatsToBridge } from "../../state/bridgeSync";
import { syncCraftingProjection } from "../../state/production/ProductionBridgeAdapter";
import type { EquipmentCandidateSource } from "./components/CharacterEquipmentPicker";

interface CharacterActions {
  readonly equip: (source: EquipmentCandidateSource, position: number) => boolean;
  readonly unequip: (slot: EquipmentSlot) => boolean;
  readonly getLoadouts: () => readonly EquipmentLoadout[];
  readonly saveLoadout: (loadoutId: string, name: string) => boolean;
  readonly renameLoadout: (loadoutId: string, name: string) => boolean;
  readonly deleteLoadout: (loadoutId: string) => boolean;
  readonly applyLoadout: (loadoutId: string) => boolean;
}

interface MovedInventoryEntry {
  readonly position: number;
  readonly entry: InventoryEntry;
}

function notifyEquipmentFailure(
  services: ReturnType<typeof useGameServices>,
  reason: string,
): void {
  const message = reason === "equipment_locked"
    ? "Impossible de changer d'équipement pendant le combat. Utilisez « Arrêter le combat » : l'arrêt aura lieu à la fin du segment en cours."
    : reason === "two_handed_conflict"
      ? "Loadout refusé : une arme à deux mains ne peut pas être combinée avec une main gauche."
      : reason === "inventory_full"
        ? "Changement refusé : l'inventaire et la banque n'ont pas assez de place pour effectuer ce changement."
        : reason === "loadout_item_missing"
          ? "Loadout refusé : au moins une pièce enregistrée n'est plus disponible dans l'inventaire ou la banque."
          : reason === "loadout_not_found"
            ? "Ce loadout n'existe plus."
            : reason === "loadout_invalid"
              ? "Loadout refusé : son équipement ne correspond plus aux pièces enregistrées."
              : "Impossible de modifier cet équipement dans l'état actuel.";
  services.bridge.addEconomyNotification({
    id: `notif_equipment_failed_${String(Date.now())}`,
    type: "error",
    message,
    timestamp: Date.now(),
  });
}

function notifyLoadoutApplied(services: ReturnType<typeof useGameServices>, name: string): void {
  services.bridge.addEconomyNotification({
    id: `notif_loadout_applied_${String(Date.now())}`,
    type: "success",
    message: `${name} équipé.`,
    timestamp: Date.now(),
  });
}

function restoreBankEntry(
  services: ReturnType<typeof useGameServices>,
  entry: InventoryEntry,
  preferredPosition: number,
): void {
  const preferredSlot = services.inventoryManager.getSlot(services.bankId, preferredPosition);
  const restored = preferredSlot.ok && preferredSlot.value.entry === undefined
    ? services.inventoryManager.insertEntry(services.bankId, entry, preferredPosition)
    : services.inventoryManager.insertEntry(services.bankId, entry, undefined, true);
  if (!restored.ok) {
    throw new Error("Bank equipment rollback failed");
  }
}

function rollbackMovedInventoryEntries(
  services: ReturnType<typeof useGameServices>,
  moved: readonly MovedInventoryEntry[],
): void {
  for (const movement of [...moved].reverse()) {
    const bankEntry = services.inventoryManager.findEntryByInstanceId(
      services.bankId,
      movement.entry.instanceId,
    );
    if (bankEntry === undefined) throw new Error("Bank staging rollback entry missing");
    const removed = services.inventoryManager.removeEntryByInstanceId(
      services.bankId,
      movement.entry.instanceId,
    );
    if (!removed.ok) throw new Error("Bank staging rollback removal failed");
    const restored = services.inventoryManager.insertEntry(
      services.heroId,
      removed.value,
      movement.position,
    );
    if (!restored.ok) throw new Error("Bank staging rollback inventory restore failed");
  }
}

export function useCharacterActions(): CharacterActions {
  const services = useGameServices();
  const refreshCharacterState = useCallback(() => {
    const { bridge, equipmentManager, inventoryManager, statsManager, heroId, bankId, productionStorageId } = services;
    syncInventoryToBridge(bridge, inventoryManager, heroId);
    syncBankToBridge(bridge, inventoryManager, bankId);
    syncEquipmentToBridge(bridge, equipmentManager, heroId);
    syncStatsToBridge(bridge, statsManager, heroId);
    syncCraftingProjection(bridge, inventoryManager, heroId, productionStorageId, bridge.crafting.productionTier);
  }, [services]);

  const equip = useCallback((source: EquipmentCandidateSource, position: number): boolean => {
    const sourceOwnerId = source === "inventory" ? services.heroId : services.bankId;
    const slot = services.inventoryManager.getSlot(sourceOwnerId, position);
    const itemId = slot.ok ? slot.value.entry?.itemId : undefined;
    if (itemId === undefined) return false;

    if (source === "inventory") {
      const result = services.equipmentManager.equipFromInventory(services.heroId, position);
      if (result.ok) refreshCharacterState();
      else notifyEquipmentFailure(services, result.reason);
      return result.ok;
    }

    const canEquip = services.equipmentManager.canEquip(services.heroId, itemId);
    if (!canEquip.ok) {
      notifyEquipmentFailure(services, canEquip.reason);
      return false;
    }

    const targetEquipped = services.equipmentManager.getEquippedItem(
      services.heroId,
      canEquip.value.slot,
    );
    const displacedOffHand = canEquip.value.slot === "weapon"
      && canEquip.value.handling === "two_handed"
      ? services.equipmentManager.getEquippedItem(services.heroId, "off_hand")
      : undefined;
    const returningCount = Number(targetEquipped !== undefined) + Number(displacedOffHand !== undefined);
    const requiredFreeSlots = Math.max(1, returningCount);

    const extracted = services.inventoryManager.takeOneAt(services.bankId, position);
    if (!extracted.ok) {
      notifyEquipmentFailure(services, extracted.reason);
      return false;
    }

    const moved: MovedInventoryEntry[] = [];
    while (services.inventoryManager.findFreeSlots(services.heroId).length < requiredFreeSlots) {
      const candidate = [...services.inventoryManager.listSlots(services.heroId)]
        .reverse()
        .find((inventorySlot) => inventorySlot.entry !== undefined);
      if (candidate?.entry === undefined) break;

      const removed = services.inventoryManager.removeEntryAt(services.heroId, candidate.position);
      if (!removed.ok) break;
      const inserted = services.inventoryManager.insertEntry(services.bankId, removed.value);
      if (!inserted.ok) {
        const restored = services.inventoryManager.insertEntry(
          services.heroId,
          removed.value,
          candidate.position,
        );
        if (!restored.ok) throw new Error("Bank equipment staging restore failed");
        break;
      }
      moved.push({ position: candidate.position, entry: removed.value });
    }

    if (services.inventoryManager.findFreeSlots(services.heroId).length < requiredFreeSlots) {
      rollbackMovedInventoryEntries(services, moved);
      restoreBankEntry(services, extracted.value, position);
      notifyEquipmentFailure(services, "inventory_full");
      refreshCharacterState();
      return false;
    }

    const staged = services.inventoryManager.insertEntry(services.heroId, extracted.value);
    if (!staged.ok) {
      rollbackMovedInventoryEntries(services, moved);
      restoreBankEntry(services, extracted.value, position);
      notifyEquipmentFailure(services, staged.reason);
      refreshCharacterState();
      return false;
    }

    const result = services.equipmentManager.equipFromInventory(services.heroId, staged.value.position);
    if (!result.ok) {
      const stagedEntry = services.inventoryManager.removeEntryByInstanceId(
        services.heroId,
        extracted.value.instanceId,
      );
      if (stagedEntry.ok) restoreBankEntry(services, stagedEntry.value, position);
      rollbackMovedInventoryEntries(services, moved);
      notifyEquipmentFailure(services, result.reason);
      refreshCharacterState();
      return false;
    }

    refreshCharacterState();
    return true;
  }, [refreshCharacterState, services]);

  const unequip = useCallback((slot: EquipmentSlot): boolean => {
    const result = services.equipmentManager.unequipToInventory(services.heroId, slot);
    if (result.ok) refreshCharacterState();
    else notifyEquipmentFailure(services, result.reason);
    return result.ok;
  }, [refreshCharacterState, services]);

  const getLoadouts = useCallback(
    (): readonly EquipmentLoadout[] => services.equipmentManager.getLoadouts(services.heroId),
    [services],
  );
  const saveLoadout = useCallback((loadoutId: string, name: string): boolean => {
    const result = services.equipmentManager.saveCurrentLoadout(services.heroId, loadoutId, name);
    if (!result.ok) notifyEquipmentFailure(services, result.reason);
    return result.ok;
  }, [services]);
  const renameLoadout = useCallback((loadoutId: string, name: string): boolean => {
    const result = services.equipmentManager.renameLoadout(services.heroId, loadoutId, name);
    if (!result.ok) notifyEquipmentFailure(services, result.reason);
    return result.ok;
  }, [services]);
  const deleteLoadout = useCallback(
    (loadoutId: string): boolean => services.equipmentManager.deleteLoadout(services.heroId, loadoutId),
    [services],
  );
  const applyLoadout = useCallback((loadoutId: string): boolean => {
    const loadout = services.equipmentManager.getLoadouts(services.heroId)
      .find((candidate) => candidate.id === loadoutId);
    if (loadout === undefined) {
      notifyEquipmentFailure(services, "loadout_not_found");
      return false;
    }
    const result = services.equipmentManager.applyLoadout(
      services.heroId,
      loadoutId,
      undefined,
      services.bankId,
    );
    if (!result.ok) {
      notifyEquipmentFailure(services, result.reason);
      return false;
    }
    refreshCharacterState();
    notifyLoadoutApplied(services, loadout.name);
    return true;
  }, [refreshCharacterState, services]);

  return { equip, unequip, getLoadouts, saveLoadout, renameLoadout, deleteLoadout, applyLoadout };
}
