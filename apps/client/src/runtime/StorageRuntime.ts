import type { EntityId } from "@game/core";
import type { InventoryEntry, InventoryManager } from "@game/gameplay";
import {
  areEntriesStackCompatible,
  effectiveMaxStack,
  getEnchantmentLevel,
} from "@game/gameplay";

export type StorageKind = "inventory" | "bank";

export interface StorageMutationResult {
  readonly ok: boolean;
  readonly reason?: string;
}

export interface StorageRange {
  readonly start: number;
  readonly length: number;
}

type RangeDestination =
  | { readonly kind: "merge"; readonly position: number }
  | { readonly kind: "empty"; readonly position: number };

export class StorageRuntime {
  public constructor(
    private readonly inventoryManager: InventoryManager,
    private readonly heroId: EntityId,
    private readonly bankId: EntityId,
  ) {}

  public moveWithin(storage: StorageKind, from: number, to: number): StorageMutationResult {
    const ownerId = this.owner(storage);
    if (from === to) return { ok: true };

    const source = this.inventoryManager.getSlot(ownerId, from);
    const target = this.inventoryManager.getSlot(ownerId, to);
    if (!source.ok) return { ok: false, reason: source.reason };
    if (!target.ok) return { ok: false, reason: target.reason };
    if (source.value.entry === undefined) return { ok: false, reason: "entry_not_found" };

    if (target.value.entry === undefined) {
      const result = this.inventoryManager.moveEntry(ownerId, from, to);
      return result.ok ? { ok: true } : { ok: false, reason: result.reason };
    }

    const merged = this.inventoryManager.mergeStacks(ownerId, from, to);
    if (merged.ok) return { ok: true };
    if (
      merged.reason !== "stack_incompatible"
      && merged.reason !== "not_stackable"
      && merged.reason !== "stack_full"
    ) {
      return { ok: false, reason: merged.reason };
    }

    const sourceEntry = this.inventoryManager.removeEntryAt(ownerId, from);
    if (!sourceEntry.ok) return { ok: false, reason: sourceEntry.reason };
    const targetEntry = this.inventoryManager.removeEntryAt(ownerId, to);
    if (!targetEntry.ok) {
      this.inventoryManager.insertEntry(ownerId, sourceEntry.value, from);
      return { ok: false, reason: targetEntry.reason };
    }

    const restoreTarget = this.inventoryManager.insertEntry(ownerId, targetEntry.value, from);
    const restoreSource = this.inventoryManager.insertEntry(ownerId, sourceEntry.value, to);
    if (restoreTarget.ok && restoreSource.ok) return { ok: true };
    return { ok: false, reason: "swap_failed" };
  }

  public canMoveWithinRange(storage: StorageKind, from: number, range: StorageRange): boolean {
    const ownerId = this.owner(storage);
    const source = this.inventoryManager.getSlot(ownerId, from);
    if (!source.ok || source.value.entry === undefined) return false;
    return this.#findRangeDestination(ownerId, source.value.entry, range, from) !== undefined;
  }

  public moveWithinRange(
    storage: StorageKind,
    from: number,
    range: StorageRange,
  ): StorageMutationResult {
    const ownerId = this.owner(storage);
    const source = this.inventoryManager.getSlot(ownerId, from);
    if (!source.ok) return { ok: false, reason: source.reason };
    const entry = source.value.entry;
    if (entry === undefined) return { ok: false, reason: "entry_not_found" };

    const destination = this.#findRangeDestination(ownerId, entry, range, from);
    if (destination === undefined) return { ok: false, reason: "inventory_full" };
    if (destination.kind === "empty") {
      const moved = this.inventoryManager.moveEntry(ownerId, from, destination.position);
      return moved.ok ? { ok: true } : { ok: false, reason: moved.reason };
    }

    const merged = this.inventoryManager.mergeStacks(ownerId, from, destination.position);
    return merged.ok ? { ok: true } : { ok: false, reason: merged.reason };
  }

  public transfer(
    fromStorage: StorageKind,
    from: number,
    toStorage: StorageKind,
    to?: number,
  ): StorageMutationResult {
    if (fromStorage === toStorage) {
      return to === undefined
        ? { ok: false, reason: "invalid_position" }
        : this.moveWithin(fromStorage, from, to);
    }

    const sourceId = this.owner(fromStorage);
    const targetId = this.owner(toStorage);
    const source = this.inventoryManager.getSlot(sourceId, from);
    if (!source.ok) return { ok: false, reason: source.reason };
    const entry = source.value.entry;
    if (entry === undefined) return { ok: false, reason: "entry_not_found" };

    if (to !== undefined) {
      const target = this.inventoryManager.getSlot(targetId, to);
      if (!target.ok) return { ok: false, reason: target.reason };
      if (target.value.entry !== undefined) return { ok: false, reason: "slot_occupied" };
    } else if (
      this.inventoryManager.isFull(targetId)
      && !this.inventoryManager.canMergeEntry(targetId, entry)
    ) {
      return { ok: false, reason: "inventory_full" };
    }

    const removed = this.inventoryManager.removeEntryAt(sourceId, from);
    if (!removed.ok) return { ok: false, reason: removed.reason };

    const inserted = this.inventoryManager.insertEntry(
      targetId,
      removed.value,
      to,
      to === undefined,
    );
    if (inserted.ok) return { ok: true };

    this.inventoryManager.insertEntry(sourceId, removed.value, from);
    return { ok: false, reason: inserted.reason };
  }

  public canTransferToRange(
    fromStorage: StorageKind,
    from: number,
    toStorage: StorageKind,
    range: StorageRange,
  ): boolean {
    if (fromStorage === toStorage) return this.canMoveWithinRange(fromStorage, from, range);
    const source = this.inventoryManager.getSlot(this.owner(fromStorage), from);
    if (!source.ok || source.value.entry === undefined) return false;
    return this.#findRangeDestination(
      this.owner(toStorage),
      source.value.entry,
      range,
    ) !== undefined;
  }

  public transferToRange(
    fromStorage: StorageKind,
    from: number,
    toStorage: StorageKind,
    range: StorageRange,
  ): StorageMutationResult {
    if (fromStorage === toStorage) return this.moveWithinRange(fromStorage, from, range);

    const sourceId = this.owner(fromStorage);
    const targetId = this.owner(toStorage);
    const source = this.inventoryManager.getSlot(sourceId, from);
    if (!source.ok) return { ok: false, reason: source.reason };
    const entry = source.value.entry;
    if (entry === undefined) return { ok: false, reason: "entry_not_found" };

    const destination = this.#findRangeDestination(targetId, entry, range);
    if (destination === undefined) return { ok: false, reason: "inventory_full" };
    if (destination.kind === "empty") {
      return this.transfer(fromStorage, from, toStorage, destination.position);
    }

    const removedSource = this.inventoryManager.removeEntryAt(sourceId, from);
    if (!removedSource.ok) return { ok: false, reason: removedSource.reason };
    const removedTarget = this.inventoryManager.removeEntryAt(targetId, destination.position);
    if (!removedTarget.ok) {
      this.inventoryManager.insertEntry(sourceId, removedSource.value, from);
      return { ok: false, reason: removedTarget.reason };
    }

    const mergedEntry: InventoryEntry = {
      ...removedTarget.value,
      quantity: removedTarget.value.quantity + removedSource.value.quantity,
    };
    const inserted = this.inventoryManager.insertEntry(targetId, mergedEntry, destination.position);
    if (inserted.ok) return { ok: true };

    const targetRollback = this.inventoryManager.insertEntry(
      targetId,
      removedTarget.value,
      destination.position,
    );
    const sourceRollback = this.inventoryManager.insertEntry(sourceId, removedSource.value, from);
    if (!targetRollback.ok || !sourceRollback.ok) {
      throw new Error("Storage range transfer rollback failed");
    }
    return { ok: false, reason: inserted.reason };
  }

  public sort(storage: StorageKind, range?: StorageRange): StorageMutationResult {
    const ownerId = this.owner(storage);
    const capacity = this.inventoryManager.getCapacity(ownerId);
    const start = range?.start ?? 0;
    const length = range?.length ?? capacity;
    const end = Math.min(capacity, start + length);
    if (
      !Number.isInteger(start)
      || !Number.isInteger(length)
      || start < 0
      || length <= 0
      || start >= capacity
    ) {
      return { ok: false, reason: "invalid_position" };
    }

    const slots = this.inventoryManager.listSlots(ownerId)
      .filter((slot) => slot.position >= start && slot.position < end);
    const entries = slots
      .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry])
      .sort((left, right) => (
        left.itemId.localeCompare(right.itemId)
        || getEnchantmentLevel(left) - getEnchantmentLevel(right)
        || right.quantity - left.quantity
      ));

    for (const slot of slots) {
      if (slot.entry !== undefined) {
        this.inventoryManager.removeEntryAt(ownerId, slot.position);
      }
    }
    entries.forEach((entry, index) => {
      this.inventoryManager.insertEntry(ownerId, entry, start + index);
    });
    return { ok: true };
  }

  #findRangeDestination(
    ownerId: EntityId,
    entry: InventoryEntry,
    range: StorageRange,
    skipPosition?: number,
  ): RangeDestination | undefined {
    const capacity = this.inventoryManager.getCapacity(ownerId);
    if (
      !Number.isInteger(range.start)
      || !Number.isInteger(range.length)
      || range.start < 0
      || range.length <= 0
      || range.start >= capacity
    ) return undefined;

    const end = Math.min(capacity, range.start + range.length);
    const maxStack = effectiveMaxStack(this.inventoryManager.stackInfoResolver?.(entry.itemId));
    if (maxStack > 1) {
      for (let position = range.start; position < end; position += 1) {
        if (position === skipPosition) continue;
        const target = this.inventoryManager.getSlot(ownerId, position);
        const targetEntry = target.ok ? target.value.entry : undefined;
        if (
          targetEntry !== undefined
          && areEntriesStackCompatible(targetEntry, entry)
          && targetEntry.quantity + entry.quantity <= maxStack
        ) {
          return { kind: "merge", position };
        }
      }
    }

    for (let position = range.start; position < end; position += 1) {
      if (position === skipPosition) continue;
      const target = this.inventoryManager.getSlot(ownerId, position);
      if (target.ok && target.value.entry === undefined) {
        return { kind: "empty", position };
      }
    }
    return undefined;
  }

  private owner(storage: StorageKind): EntityId {
    return storage === "inventory" ? this.heroId : this.bankId;
  }
}
