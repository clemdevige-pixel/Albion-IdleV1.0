import type { EntityId, World } from "@game/core";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import {
  isEnchantmentLevel,
  type EnchantmentLevel,
  type InventoryEntry,
  type ItemInstanceId,
} from "../inventory/types.js";
import { EquipmentComponent, type EquipmentData } from "./components.js";
import type { EquipmentStatSync } from "./equipment-stat-sync.js";
import {
  equipmentFail,
  equipmentOk,
  type EquipOutcome,
  type EquipmentInfoLike,
  type EquipmentInfoResolver,
  type EquipmentResult,
  type EquipmentSlot,
  type UnequipOutcome,
  type WeaponHandling,
} from "./types.js";

export class EquipmentManager {
  readonly #world: World;
  readonly #inventoryManager: InventoryManager;
  readonly #resolveEquipmentInfo: EquipmentInfoResolver;
  readonly #statSync: EquipmentStatSync | undefined;
  readonly #equipped = new Set<EntityId>();

  constructor(
    world: World,
    inventoryManager: InventoryManager,
    resolveEquipmentInfo: EquipmentInfoResolver,
    statSync?: EquipmentStatSync,
  ) {
    this.#world = world;
    this.#inventoryManager = inventoryManager;
    this.#resolveEquipmentInfo = resolveEquipmentInfo;
    this.#statSync = statSync;
  }

  get equipmentInfoResolver(): EquipmentInfoResolver {
    return this.#resolveEquipmentInfo;
  }

  attachEquipment(entityId: EntityId): void {
    const data: EquipmentData = { slots: new Map() };
    this.#world.addComponent(entityId, EquipmentComponent, data);
    this.#equipped.add(entityId);
  }

  detachEquipment(entityId: EntityId): void {
    const data = this.#getData(entityId);
    if (data.slots.size > 0) {
      throw new Error("Cannot detach equipment while items are equipped (no item loss)");
    }
    this.#world.removeComponent(entityId, EquipmentComponent);
    this.#equipped.delete(entityId);
  }

  hasEquipment(entityId: EntityId): boolean {
    return this.#world.hasComponent(entityId, EquipmentComponent);
  }

  listEquippedEntities(): readonly EntityId[] {
    return [...this.#equipped];
  }

  getEquipped(entityId: EntityId): ReadonlyMap<EquipmentSlot, InventoryEntry> {
    return this.#getData(entityId).slots;
  }

  getEquippedItem(entityId: EntityId, slot: EquipmentSlot): InventoryEntry | undefined {
    return this.#getData(entityId).slots.get(slot);
  }

  changeEquippedEnchantment(
    entityId: EntityId,
    instanceId: ItemInstanceId,
    enchantment: EnchantmentLevel,
  ): boolean {
    if (!isEnchantmentLevel(enchantment)) return false;
    const data = this.#getData(entityId);
    for (const [slot, entry] of data.slots) {
      if (entry.instanceId !== instanceId) continue;
      data.slots.set(slot, { ...entry, enchantment });
      this.syncStats(entityId);
      return true;
    }
    return false;
  }

  canEquip(entityId: EntityId, itemId: string): EquipmentResult<EquipmentInfoLike> {
    const info = this.#resolveEquipmentInfo(itemId);
    if (info === undefined) {
      return equipmentFail("not_equippable");
    }
    const data = this.#getData(entityId);
    if (info.slot === "off_hand" && this.#weaponHandling(data) === "two_handed") {
      return equipmentFail("two_handed_conflict");
    }
    return equipmentOk(info);
  }

  equipFromInventory(entityId: EntityId, position: number): EquipmentResult<EquipOutcome> {
    const data = this.#getData(entityId);
    const slotResult = this.#inventoryManager.getSlot(entityId, position);
    if (!slotResult.ok) {
      return equipmentFail("invalid_position");
    }
    const entry = slotResult.value.entry;
    if (entry === undefined) {
      return equipmentFail("entry_not_found");
    }
    const info = this.#resolveEquipmentInfo(entry.itemId);
    if (info === undefined) {
      return equipmentFail("not_equippable");
    }
    const slot = info.slot;
    if (slot === "off_hand" && this.#weaponHandling(data) === "two_handed") {
      return equipmentFail("two_handed_conflict");
    }

    const replaced = data.slots.get(slot);
    let displacedOffHand: InventoryEntry | undefined;
    if (slot === "weapon" && info.handling === "two_handed") {
      displacedOffHand = data.slots.get("off_hand");
    }

    // A single source item vacates its slot. A stacked source remains in place,
    // so every displaced equipped item needs another free inventory slot.
    const returningCount = [replaced, displacedOffHand].filter(
      (returningEntry) =>
        returningEntry !== undefined
        && !this.#inventoryManager.canMergeEntry(entityId, returningEntry),
    ).length;
    const sourceVacatesSlot = entry.quantity === 1;
    const availableDestinations =
      this.#inventoryManager.findFreeSlots(entityId).length + (sourceVacatesSlot ? 1 : 0);
    if (availableDestinations < returningCount) {
      return equipmentFail("inventory_full");
    }

    const extracted = this.#inventoryManager.takeOneAt(entityId, position);
    if (!extracted.ok) {
      return equipmentFail(
        extracted.reason === "invalid_position" ? "invalid_position" : "entry_not_found",
      );
    }
    const equippedEntry = extracted.value;
    data.slots.set(slot, equippedEntry);
    if (replaced !== undefined) {
      this.#inventoryManager.insertEntry(
        entityId,
        replaced,
        sourceVacatesSlot ? position : undefined,
        true,
      );
    }
    if (displacedOffHand !== undefined) {
      data.slots.delete("off_hand");
      this.#inventoryManager.insertEntry(
        entityId,
        displacedOffHand,
        replaced === undefined && sourceVacatesSlot ? position : undefined,
        true,
      );
    }
    this.syncStats(entityId);
    return equipmentOk({ slot, equipped: equippedEntry, replaced, displacedOffHand });
  }

  unequipToInventory(entityId: EntityId, slot: EquipmentSlot): EquipmentResult<UnequipOutcome> {
    const data = this.#getData(entityId);
    const entry = data.slots.get(slot);
    if (entry === undefined) {
      return equipmentFail("slot_empty");
    }
    const inserted = this.#inventoryManager.insertEntry(entityId, entry, undefined, true);
    if (!inserted.ok) {
      return equipmentFail("inventory_full");
    }
    data.slots.delete(slot);
    this.syncStats(entityId);
    return equipmentOk({ slot, entry, position: inserted.value.position });
  }

  /**
   * Rebuilds stat modifiers from the worn set. No-op without a stat sync or
   * without stats on the entity; call again once stats are attached (e.g.
   * after a save load restores equipment before stats exist).
   */
  syncStats(entityId: EntityId): void {
    this.#statSync?.apply(entityId, this.#getData(entityId).slots);
  }

  /** Restores loaded equipment; reserved for the save provider. */
  _restore(entityId: EntityId, data: EquipmentData): void {
    this.#world.setComponent(entityId, EquipmentComponent, data);
    this.#equipped.add(entityId);
    this.syncStats(entityId);
  }

  #getData(entityId: EntityId): EquipmentData {
    return this.#world.getComponent(entityId, EquipmentComponent);
  }

  #weaponHandling(data: EquipmentData): WeaponHandling {
    const weapon = data.slots.get("weapon");
    if (weapon === undefined) {
      return "none";
    }
    return this.#resolveEquipmentInfo(weapon.itemId)?.handling ?? "none";
  }
}
