import type {
  InventoryManager,
  InventoryResult,
  AddQuantityOutcome,
  ItemStackInfoLike,
  EnchantmentLevel,
} from "@game/gameplay";
import type { EntityId } from "@game/core";

/**
 * Production must never keep a partial output. InventoryManager.addQuantity can
 * legitimately return success with a remainder; gathering/refining/workers
 * require all-or-nothing semantics so resources and XP cannot desync.
 */
export function addProductionQuantityAtomically(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  itemId: string,
  quantity: number,
  stackInfo?: ItemStackInfoLike,
  enchantment: EnchantmentLevel = 0,
): InventoryResult<AddQuantityOutcome> {
  const result = inventoryManager.addQuantity(
    entityId,
    itemId,
    quantity,
    stackInfo,
    enchantment,
  );

  if (!result.ok || result.value.remainder === 0) {
    return result;
  }

  if (result.value.added > 0) {
    const rollback = inventoryManager.removeQuantity(
      entityId,
      itemId,
      result.value.added,
      enchantment,
    );
    if (!rollback.ok) {
      throw new Error(
        `Atomic production rollback failed for ${itemId} x${String(result.value.added)}`,
      );
    }
  }

  return { ok: false, reason: "inventory_full" };
}

/**
 * Adapter used only by production runtimes. Every method remains delegated to
 * the authoritative InventoryManager except addQuantity, which becomes atomic.
 */
export function createAtomicProductionInventoryManager(
  inventoryManager: InventoryManager,
): InventoryManager {
  return new Proxy(inventoryManager, {
    get(target, property) {
      if (property === "addQuantity") {
        return (
          entityId: EntityId,
          itemId: string,
          quantity: number,
          stackInfo?: ItemStackInfoLike,
          enchantment: EnchantmentLevel = 0,
        ) => addProductionQuantityAtomically(
          target,
          entityId,
          itemId,
          quantity,
          stackInfo,
          enchantment,
        );
      }

      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      const callable = value as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => callable.apply(target, args);
    },
  });
}
