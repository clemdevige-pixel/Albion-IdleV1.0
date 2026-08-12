import type { InventoryEntry } from "../inventory/types.js";

/**
 * V1 equipment slots per AI_BIBLE 31_EQUIPMENT_SYSTEM "Equipment Slots (V1)":
 * Head, Chest, Boots, Weapon, Off-Hand, Cape. Future slots (mount, bag, food,
 * potion) are disabled during V1 and must be enabled through configuration.
 */
export type EquipmentSlot = "head" | "chest" | "boots" | "weapon" | "off_hand" | "cape";

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  "head",
  "chest",
  "boots",
  "weapon",
  "off_hand",
  "cape",
] as const;

/** Weapon handling per 31_EQUIPMENT "Weapon Types". */
export type WeaponHandling = "one_handed" | "two_handed" | "none";

/**
 * Equip-relevant projection of an equipment definition (23_EQUIPMENT_DATA).
 * Kept structural so gameplay stays decoupled from @game/data, mirroring the
 * inventory StackInfoResolver pattern.
 */
export interface EquipmentInfoLike {
  readonly itemId: string;
  readonly slot: EquipmentSlot;
  readonly handling: WeaponHandling;
  /** Fixed additive stat bonuses keyed by StatId (11_STAT §6: equipment bonuses are additive). */
  readonly stats?: Readonly<Record<string, number>> | undefined;
}

/** Items without equipment info are not equippable (23_EQUIPMENT "Item First"). */
export type EquipmentInfoResolver = (itemId: string) => EquipmentInfoLike | undefined;

export interface EquipOutcome {
  readonly slot: EquipmentSlot;
  readonly equipped: InventoryEntry;
  /** Item previously in the slot, returned to the vacated inventory position. */
  readonly replaced: InventoryEntry | undefined;
  /** Off-hand pushed back to inventory when a two-handed weapon was equipped. */
  readonly displacedOffHand: InventoryEntry | undefined;
}

export interface UnequipOutcome {
  readonly slot: EquipmentSlot;
  readonly entry: InventoryEntry;
  /** Inventory position the item was returned to. */
  readonly position: number;
}

export type EquipmentFailureReason =
  | "invalid_position"
  | "entry_not_found"
  | "not_equippable"
  | "invalid_quantity"
  | "two_handed_conflict"
  | "slot_empty"
  | "inventory_full"
  | "equipment_locked";

export type EquipmentResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: EquipmentFailureReason };

export function equipmentOk<T>(value: T): EquipmentResult<T> {
  return { ok: true, value };
}

export function equipmentFail<T>(reason: EquipmentFailureReason): EquipmentResult<T> {
  return { ok: false, reason };
}
