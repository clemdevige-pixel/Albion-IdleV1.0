import type { Brand } from "@game/core";

/**
 * Persistent handle for an inventory entry (37_SAVE_SYSTEM "Inventory Data":
 * Item Instance IDs). It identifies a slot entry, not item identity —
 * 13_ITEM_SYSTEM keeps items definition-based.
 */
export type ItemInstanceId = Brand<string, "ItemInstanceId">;

export function toItemInstanceId(counter: number): ItemInstanceId {
  return `item_${String(counter)}` as ItemInstanceId;
}

/** Equipment enchantment variant. Zero is the unenchanted default. */
export type EnchantmentLevel = 0 | 1 | 2 | 3 | 4;

export function isEnchantmentLevel(value: number): value is EnchantmentLevel {
  return Number.isInteger(value) && value >= 0 && value <= 4;
}

export interface InventoryEntry {
  readonly instanceId: ItemInstanceId;
  readonly itemId: string;
  readonly quantity: number;
  /** Missing only in legacy saves/callers and is interpreted as level zero. */
  readonly enchantment?: EnchantmentLevel;
}

export function getEnchantmentLevel(
  entry: Pick<InventoryEntry, "enchantment"> | undefined,
): EnchantmentLevel {
  return entry?.enchantment ?? 0;
}

/** Stack identity for the first enchantment slice: item + enchantment. */
export function areEntriesStackCompatible(
  left: Pick<InventoryEntry, "itemId" | "enchantment">,
  right: Pick<InventoryEntry, "itemId" | "enchantment">,
): boolean {
  return left.itemId === right.itemId
    && getEnchantmentLevel(left) === getEnchantmentLevel(right);
}

/**
 * Stack rules for an item, mirrored from item data (13_ITEM_SYSTEM: the
 * Inventory System reads stack limits from the Item System). Kept structural
 * so gameplay stays decoupled from @game/data.
 */
export interface ItemStackInfoLike {
  readonly itemId: string;
  readonly stackable: boolean;
  readonly maxStack: number;
}

export type StackInfoResolver = (itemId: string) => ItemStackInfoLike | undefined;

/**
 * Bag rules for an item, mirrored from item data (12_INVENTORY §5: bag
 * statistics are defined by the Item System). A bag provides only one gameplay
 * effect — increasing inventory capacity.
 */
export interface BagInfoLike {
  readonly itemId: string;
  readonly capacityBonus: number;
}

/** Items without bag info cannot occupy the Bag Slot (12_INVENTORY §5). */
export type BagInfoResolver = (itemId: string) => BagInfoLike | undefined;

/** Result of an active-bag change (12_INVENTORY §5: only one bag active). */
export interface BagChangeOutcome {
  readonly activeBag: InventoryEntry | undefined;
  readonly previousBag: InventoryEntry | undefined;
  /** Current capacity after the change (base + active bag bonus, §4). */
  readonly capacity: number;
}

/** 12_INVENTORY_SYSTEM §8: non-stackable items effectively stack to one. */
export function effectiveMaxStack(info: ItemStackInfoLike | undefined): number {
  if (info === undefined || !info.stackable) {
    return 1;
  }
  return info.maxStack;
}

export interface AddQuantityOutcome {
  readonly requested: number;
  readonly added: number;
  /** Quantity that did not fit; never silently discarded (12_INVENTORY §13). */
  readonly remainder: number;
  readonly affectedPositions: readonly number[];
}

export interface RemoveQuantityOutcome {
  readonly removed: number;
  readonly emptiedPositions: readonly number[];
}

export interface MergeStacksOutcome {
  readonly moved: number;
  /** True when the source stack was fully absorbed and its slot freed. */
  readonly sourceEmptied: boolean;
}

export interface InventorySlot {
  readonly position: number;
  readonly entry: InventoryEntry | undefined;
}

export type InventoryFailureReason =
  | "inventory_full"
  | "slot_occupied"
  | "invalid_position"
  | "entry_not_found"
  | "invalid_quantity"
  | "insufficient_quantity"
  | "not_stackable"
  | "stack_incompatible"
  | "stack_full"
  | "not_a_bag"
  | "no_active_bag"
  | "capacity_exceeded";

export type InventoryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: InventoryFailureReason };

export function inventoryOk<T>(value: T): InventoryResult<T> {
  return { ok: true, value };
}

export function inventoryFail<T>(reason: InventoryFailureReason): InventoryResult<T> {
  return { ok: false, reason };
}
