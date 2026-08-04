import type { EntityId } from "@game/core";
import type { InventoryManager, EquipmentManager, StatsManager, StatId, EquipmentSlot, CurrencyService, WalletId, VendorRegistry } from "@game/gameplay";
import { EQUIPMENT_SLOTS, getEnchantmentLevel } from "@game/gameplay";
import type { GameBridge, InventoryVM, InventorySlotVM, EquipmentSlotVM, StatEntryVM, VendorOfferVM, WorldVM, MasteryVM } from "../game/GameBridge";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";

const STAT_IDS: readonly StatId[] = [
  "stat_max_health" as StatId,
  "stat_max_energy" as StatId,
  "stat_physical_damage" as StatId,
  "stat_magical_damage" as StatId,
  "stat_armor" as StatId,
  "stat_magic_resistance" as StatId,
  "stat_attack_speed" as StatId,
  "stat_move_speed" as StatId,
];

/**
 * Production materials are stored by the inventory system for persistence and
 * crafting, but are displayed exclusively in the Production panel.
 *
 * This convention is tier-agnostic: future T5/T6 raw and refined materials
 * inherit the same behaviour without being added to a manual allow-list.
 */
function isProductionStorageItem(itemId: string): boolean {
  if (
    itemId === "item_resource_enchantment_essence"
    || itemId === "item_resource_arcane_crystal"
    || itemId === "item_resource_enchantment_catalyst"
  ) {
    return false;
  }
  return itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_");
}

export function syncInventoryToBridge(bridge: GameBridge, inventoryManager: InventoryManager, entityId: EntityId): void {
  const slots = inventoryManager.listSlots(entityId);
  const visibleSlots: InventorySlotVM[] = [];
  const emptySlots: InventorySlotVM[] = [];

  for (const s of slots) {
    const isVisibleItem =
      s.entry !== undefined && !isProductionStorageItem(s.entry.itemId);
    if (isVisibleItem) {
      visibleSlots.push({
        position: s.position,
        itemId: s.entry?.itemId,
        instanceId: s.entry?.instanceId,
        quantity: s.entry?.quantity ?? 0,
        enchantment: getEnchantmentLevel(s.entry),
      });
      continue;
    }
    emptySlots.push({
      position: s.position,
      itemId: undefined,
      instanceId: undefined,
      quantity: 0,
      enchantment: 0,
    });
  }

  // Production resources live in dedicated counters. Keep their physical
  // inventory positions for gameplay, but render all visible items first so
  // hidden materials never create blank holes in the grid.
  const slotVMs = [...visibleSlots, ...emptySlots];
  const vm: InventoryVM = {
    slots: slotVMs,
    capacity: inventoryManager.getCapacity(entityId),
    occupied: visibleSlots.length,
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

export function syncEquipmentToBridge(bridge: GameBridge, equipmentManager: EquipmentManager, entityId: EntityId): void {
  const equipped = equipmentManager.getEquipped(entityId);
  const slotVMs: EquipmentSlotVM[] = EQUIPMENT_SLOTS.map((slot: EquipmentSlot) => {
    const entry = equipped.get(slot);
    const presentation = resolveEquipmentPresentation(entry?.itemId);
    return {
      slot,
      itemId: entry?.itemId,
      instanceId: entry?.instanceId,
      enchantment: getEnchantmentLevel(entry),
      visualManifestId: presentation?.actorManifestId,
      combatPresentationProfileId: presentation?.combatProfileId,
    };
  });
  bridge.updateEquipment({ slots: slotVMs });
}

export function syncStatsToBridge(bridge: GameBridge, statsManager: StatsManager, entityId: EntityId): void {
  const entries: StatEntryVM[] = STAT_IDS.map((id) => {
    const val = statsManager.getStat(entityId, id);
    return { id, base: val.base, computed: val.computed };
  });
  bridge.updateStats({ stats: entries });
}

export function syncWalletToBridge(
  bridge: GameBridge,
  currencyService: CurrencyService,
  walletId: WalletId,
  incomeRate: number,
): void {
  const result = currencyService.getBalance(walletId, "currency_silver");
  const silver = result.ok ? result.value : 0;
  bridge.updateWallet({ silver, incomeRate });
}

export function syncVendorToBridge(
  bridge: GameBridge,
  vendorRegistry: VendorRegistry,
  vendorId: string,
): void {
  const vendor = vendorRegistry.get(vendorId);
  if (vendor === undefined) {
    return;
  }
  const offers: VendorOfferVM[] = vendor.offers
    .filter((o) => o.enabled)
    .map((o) => ({
      itemId: o.itemId,
      buyPrice: o.buyPrice,
      sellPrice: o.sellPrice,
      maxPerTransaction: o.maxPerTransaction,
    }));
  bridge.updateVendor({
    vendorId: vendor.vendorId,
    role: vendor.role,
    offers,
  });
}

export function syncProgressionToBridge(
  bridge: GameBridge,
  totalFame: number,
  overflowPool: number,
  masteries: readonly MasteryVM[],
): void {
  bridge.updateProgression({ totalFame, overflowPool, masteries });
}

export function syncRepairToBridge(
  bridge: GameBridge,
  repairItems: readonly { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[],
): void {
  let totalCost = 0;
  const items = repairItems.map((item) => {
    totalCost += item.repairCost;
    return {
      instanceId: item.instanceId,
      itemId: item.itemId,
      currentDurability: item.currentDurability,
      maxDurability: item.maxDurability,
      repairCost: item.repairCost,
    };
  });
  bridge.updateRepair({ items, totalCost });
}

export function syncWorldToBridge(
  bridge: GameBridge,
  world: WorldVM,
): void {
  bridge.updateWorld(world);
}

export function syncAllToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  equipmentManager: EquipmentManager,
  statsManager: StatsManager,
  currencyService: CurrencyService,
  walletId: WalletId,
  incomeRate: number,
  vendorRegistry: VendorRegistry,
  vendorId: string,
  entityId: EntityId,
  totalFame: number,
  overflowPool: number,
  masteries: readonly MasteryVM[],
): void {
  syncInventoryToBridge(bridge, inventoryManager, entityId);
  syncEquipmentToBridge(bridge, equipmentManager, entityId);
  syncStatsToBridge(bridge, statsManager, entityId);
  syncWalletToBridge(bridge, currencyService, walletId, incomeRate);
  syncVendorToBridge(bridge, vendorRegistry, vendorId);
  syncProgressionToBridge(bridge, totalFame, overflowPool, masteries);
}
