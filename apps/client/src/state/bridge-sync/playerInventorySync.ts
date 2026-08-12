import type { EntityId } from "@game/core";
import {
  EQUIPMENT_SLOTS,
  getEnchantmentLevel,
  type EquipmentManager,
  type EquipmentSlot,
  type InventoryManager,
  type StatId,
  type StatsManager,
} from "@game/gameplay";
import { resolveEquipmentPresentation } from "../../data/equipmentPresentation";
import type {
  EquipmentSlotVM,
  GameBridge,
  InventorySlotVM,
  InventoryVM,
  StatEntryVM,
} from "../../game/GameBridge";

const STAT_IDS: readonly StatId[] = [
  "stat_max_health" as StatId,
  "stat_physical_damage" as StatId,
  "stat_magical_damage" as StatId,
  "stat_armor" as StatId,
  "stat_magic_resistance" as StatId,
  "stat_attack_speed" as StatId,
  "stat_move_speed" as StatId,
];

export function syncInventoryToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  entityId: EntityId,
): void {
  const slots = inventoryManager.listSlots(entityId);
  const slotVMs: InventorySlotVM[] = slots.map((slot) => ({
    position: slot.position,
    itemId: slot.entry?.itemId,
    instanceId: slot.entry?.instanceId,
    quantity: slot.entry?.quantity ?? 0,
    enchantment: slot.entry === undefined ? 0 : getEnchantmentLevel(slot.entry),
  }));
  const vm: InventoryVM = {
    slots: slotVMs,
    capacity: inventoryManager.getCapacity(entityId),
    occupied: inventoryManager.getOccupiedCount(entityId),
  };
  bridge.updateInventory(vm);
}

export function syncBankToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  entityId: EntityId,
): void {
  const slots: InventorySlotVM[] = inventoryManager.listSlots(entityId).map((slot) => ({
    position: slot.position,
    itemId: slot.entry?.itemId,
    instanceId: slot.entry?.instanceId,
    quantity: slot.entry?.quantity ?? 0,
    enchantment: getEnchantmentLevel(slot.entry),
  }));
  bridge.updateBank({
    slots,
    capacity: inventoryManager.getCapacity(entityId),
    occupied: slots.filter((slot) => slot.itemId !== undefined).length,
  });
}

export function syncEquipmentToBridge(
  bridge: GameBridge,
  equipmentManager: EquipmentManager,
  entityId: EntityId,
): void {
  const equipped = equipmentManager.getEquipped(entityId);
  const slots: EquipmentSlotVM[] = EQUIPMENT_SLOTS.map((slot: EquipmentSlot) => {
    const entry = equipped.get(slot);
    const presentation = resolveEquipmentPresentation(entry?.itemId);
    return {
      slot,
      itemId: entry?.itemId,
      instanceId: entry?.instanceId,
      enchantment: getEnchantmentLevel(entry),
      visualManifestId: presentation?.actorManifestId,
      combatPresentationProfileId: presentation?.combatProfileId,
combatPresentation: presentation?.combatPresentation,
    };
  });
  bridge.updateEquipment({ slots });
}

export function syncStatsToBridge(
  bridge: GameBridge,
  statsManager: StatsManager,
  entityId: EntityId,
): void {
  const stats: StatEntryVM[] = STAT_IDS.map((id) => {
    const value = statsManager.getStat(entityId, id);
    return { id, base: value.base, computed: value.computed };
  });
  bridge.updateStats({ stats });
}
