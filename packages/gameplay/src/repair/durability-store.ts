import type { EntityId } from "@game/core";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import type { InventoryEntry, ItemInstanceId } from "../inventory/types.js";
import { type RepairResult, repairFail, repairOk } from "./types.js";

export interface DurabilityState {
  readonly current: number;
  readonly max: number;
}

export interface DamageOutcome {
  readonly current: number;
  readonly destroyed: boolean;
}

/**
 * Per-instance durability, kept outside InventoryEntry so the certified
 * inventory/equipment structures stay untouched (31_EQUIPMENT / 37_SAVE).
 * Items without a record have no durability and are never repairable.
 */
export class DurabilityStore {
  private readonly records = new Map<ItemInstanceId, { current: number; max: number }>();
  private readonly destroyed = new Set<ItemInstanceId>();

  attach(
    instanceId: ItemInstanceId,
    max: number,
    current?: number,
  ): RepairResult<DurabilityState> {
    const initial = current ?? max;
    if (!isValidDurabilityPair(initial, max)) {
      return repairFail("invalid_durability");
    }
    if (this.records.has(instanceId) || this.destroyed.has(instanceId)) {
      return repairFail("invalid_durability");
    }
    this.records.set(instanceId, { current: initial, max });
    return repairOk({ current: initial, max });
  }

  get(instanceId: ItemInstanceId): DurabilityState | undefined {
    const record = this.records.get(instanceId);
    return record === undefined ? undefined : { current: record.current, max: record.max };
  }

  isDestroyed(instanceId: ItemInstanceId): boolean {
    return this.destroyed.has(instanceId);
  }

  /**
   * 34_REPAIR_SYSTEM "Durability and Destruction": at zero the record is
   * deleted and the instance is permanently unrepairable. Removal from
   * inventory/equipment is the caller's job (combat-driven, later phase).
   */
  applyDamage(instanceId: ItemInstanceId, amount: number): RepairResult<DamageOutcome> {
    const record = this.records.get(instanceId);
    if (record === undefined) {
      return repairFail(this.destroyed.has(instanceId) ? "item_destroyed" : "item_not_found");
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return repairFail("invalid_durability");
    }
    const next = Math.max(0, record.current - amount);
    if (next === 0) {
      this.records.delete(instanceId);
      this.destroyed.add(instanceId);
      return repairOk({ current: 0, destroyed: true });
    }
    record.current = next;
    return repairOk({ current: next, destroyed: false });
  }

  /** 34_REPAIR_SYSTEM "Full Restoration": no partial repairs, max never changes. */
  restoreToMax(instanceId: ItemInstanceId): RepairResult<DurabilityState> {
    const record = this.records.get(instanceId);
    if (record === undefined) {
      return repairFail(this.destroyed.has(instanceId) ? "item_destroyed" : "item_not_found");
    }
    record.current = record.max;
    return repairOk({ current: record.current, max: record.max });
  }

  /** Deterministic snapshot for persistence; destroyed ids are never saved. */
  entries(): readonly (readonly [ItemInstanceId, DurabilityState])[] {
    return [...this.records.entries()]
      .map(([id, record]): readonly [ItemInstanceId, DurabilityState] => [
        id,
        { current: record.current, max: record.max },
      ])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /** Exact restore, reserved for the save provider (37_SAVE_SYSTEM). */
  _restore(instanceId: ItemInstanceId, current: number, max: number): RepairResult<DurabilityState> {
    return this.attach(instanceId, max, current);
  }
}

/** Durability is a positive safe-integer pair with 1 ≤ current ≤ max. */
export function isValidDurabilityPair(current: number, max: number): boolean {
  return (
    Number.isSafeInteger(current) &&
    Number.isSafeInteger(max) &&
    max >= 1 &&
    current >= 1 &&
    current <= max
  );
}

/**
 * Destruction primitive: removes a destroyed instance from the inventory
 * (34_REPAIR_SYSTEM "Durability and Destruction": the item is removed).
 */
export function removeDestroyedFromInventory(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  instanceId: ItemInstanceId,
): InventoryEntry | undefined {
  const removed = inventoryManager.removeEntryByInstanceId(entityId, instanceId);
  return removed.ok ? removed.value : undefined;
}
