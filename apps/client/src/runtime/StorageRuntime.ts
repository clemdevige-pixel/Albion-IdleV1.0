import type { EntityId } from "@game/core";
import type { InventoryManager } from "@game/gameplay";
import { getEnchantmentLevel } from "@game/gameplay";

export type StorageKind = "inventory" | "bank";

export interface StorageMutationResult {
  readonly ok: boolean;
  readonly reason?: string;
}

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

  public sort(storage: StorageKind): StorageMutationResult {
    const ownerId = this.owner(storage);
    const entries = this.inventoryManager.listSlots(ownerId)
      .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry])
      .sort((left, right) => (
        left.itemId.localeCompare(right.itemId)
        || getEnchantmentLevel(left) - getEnchantmentLevel(right)
        || right.quantity - left.quantity
      ));

    for (const slot of this.inventoryManager.listSlots(ownerId)) {
      if (slot.entry !== undefined) {
        this.inventoryManager.removeEntryAt(ownerId, slot.position);
      }
    }
    entries.forEach((entry, position) => {
      this.inventoryManager.insertEntry(ownerId, entry, position);
    });
    return { ok: true };
  }

  private owner(storage: StorageKind): EntityId {
    return storage === "inventory" ? this.heroId : this.bankId;
  }
}
