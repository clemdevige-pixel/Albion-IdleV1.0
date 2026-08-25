import type { EntityId } from "@game/core";
import { effectiveMaxStack, getEnchantmentLevel, InventoryManager } from "@game/gameplay";

/**
 * Player-facing inventory manager with an explicit accessible-storage graph.
 *
 * Only systems that intentionally opt into accessible storage use these helpers;
 * ordinary inventory actions remain local to their owner inventory.
 */
export class PlayerInventoryManager extends InventoryManager {
  readonly #accessibleOwners = new Map<EntityId, readonly EntityId[]>();

  public setAccessibleStorageOwners(ownerId: EntityId, ownerIds: readonly EntityId[]): void {
    const uniqueOwners = [...new Set(ownerIds)];
    if (!uniqueOwners.includes(ownerId)) uniqueOwners.unshift(ownerId);
    this.#accessibleOwners.set(ownerId, uniqueOwners);
  }

  public getAccessibleStorageOwners(ownerId: EntityId): readonly EntityId[] {
    return this.#accessibleOwners.get(ownerId) ?? [ownerId];
  }

  public getAccessibleQuantity(ownerId: EntityId, itemId: string): number {
    return this.getAccessibleStorageOwners(ownerId).reduce(
      (total, storageOwnerId) => total + this.getTotalQuantity(storageOwnerId, itemId),
      0,
    );
  }

  public hasAccessibleQuantity(ownerId: EntityId, itemId: string, quantity: number): boolean {
    return Number.isInteger(quantity)
      && quantity > 0
      && this.getAccessibleQuantity(ownerId, itemId) >= quantity;
  }

  /**
   * Atomically credits a stackable item across the owner's accessible storages.
   * Existing compatible stacks are filled across Inventory + Bank before a new
   * stack is created. New stacks still follow authoritative storage order:
   * Inventory first, then linked storages.
   * If the complete quantity cannot be stored, every partial write is rolled back.
   */
  public addAccessibleQuantity(ownerId: EntityId, itemId: string, quantity: number): boolean {
    if (!Number.isInteger(quantity) || quantity <= 0) return false;

    const owners = this.getAccessibleStorageOwners(ownerId);
    let remaining = quantity;
    const credited: { ownerId: EntityId; quantity: number }[] = [];
    const maxStack = effectiveMaxStack(this.stackInfoResolver?.(itemId));

    if (maxStack > 1) {
      for (const storageOwnerId of owners) {
        if (remaining <= 0) break;
        const existingHeadroom = this.findEntriesByItemId(storageOwnerId, itemId).reduce(
          (total, slot) => {
            const entry = slot.entry;
            if (entry === undefined || getEnchantmentLevel(entry) !== 0) return total;
            return total + Math.max(0, maxStack - entry.quantity);
          },
          0,
        );
        const toExistingStacks = Math.min(existingHeadroom, remaining);
        if (toExistingStacks <= 0) continue;

        const added = this.addQuantity(storageOwnerId, itemId, toExistingStacks);
        if (!added.ok || added.value.added !== toExistingStacks || added.value.remainder !== 0) {
          this.rollbackAccessibleCredit(itemId, credited);
          return false;
        }
        credited.push({ ownerId: storageOwnerId, quantity: toExistingStacks });
        remaining -= toExistingStacks;
      }
    }

    for (const storageOwnerId of owners) {
      if (remaining <= 0) break;
      const added = this.addQuantity(storageOwnerId, itemId, remaining);
      if (!added.ok) continue;

      if (added.value.added > 0) {
        credited.push({ ownerId: storageOwnerId, quantity: added.value.added });
        remaining = added.value.remainder;
      }
    }

    if (remaining === 0) return true;
    this.rollbackAccessibleCredit(itemId, credited);
    return false;
  }

  /**
   * Atomically consumes a stackable item from the owner's accessible storages.
   * Storage order is authoritative: inventory first, then linked storages.
   */
  public removeAccessibleQuantity(ownerId: EntityId, itemId: string, quantity: number): boolean {
    if (!this.hasAccessibleQuantity(ownerId, itemId, quantity)) return false;

    let remaining = quantity;
    const paid: { ownerId: EntityId; quantity: number }[] = [];
    for (const storageOwnerId of this.getAccessibleStorageOwners(ownerId)) {
      if (remaining <= 0) break;
      const available = this.getTotalQuantity(storageOwnerId, itemId);
      const toRemove = Math.min(available, remaining);
      if (toRemove <= 0) continue;

      const removed = this.removeQuantity(storageOwnerId, itemId, toRemove);
      if (!removed.ok) {
        for (const entry of paid) this.addQuantity(entry.ownerId, itemId, entry.quantity);
        return false;
      }
      paid.push({ ownerId: storageOwnerId, quantity: toRemove });
      remaining -= toRemove;
    }

    if (remaining === 0) return true;
    for (const entry of paid) this.addQuantity(entry.ownerId, itemId, entry.quantity);
    return false;
  }

  private rollbackAccessibleCredit(
    itemId: string,
    credited: readonly { ownerId: EntityId; quantity: number }[],
  ): void {
    for (const entry of [...credited].reverse()) {
      const removed = this.removeQuantity(entry.ownerId, itemId, entry.quantity);
      if (!removed.ok) {
        throw new Error("Accessible inventory credit rollback failed");
      }
    }
  }
}
