import type { EntityId } from "@game/core";
import type { InventoryManager } from "@game/gameplay";

/**
 * Resources that belong to the player's visible item inventory rather than the
 * hidden production-material storage. Keep this classification explicit:
 * faction loot also uses the `item_resource_` prefix and must survive save/load
 * migrations in the hero inventory.
 */
export function isVisibleInventoryResource(itemId: string): boolean {
  return itemId === "item_resource_enchantment_essence"
    || itemId === "item_resource_arcane_crystal"
    || itemId === "item_resource_enchantment_catalyst"
    || itemId.startsWith("item_resource_key_fragment_")
    || itemId.startsWith("item_resource_dungeon_key_")
    || itemId.startsWith("item_resource_artifact_fragment_")
    || itemId.startsWith("item_resource_artifact_");
}

/** Raw and refined production materials never occupy the hero item inventory. */
export function isProductionMaterial(itemId: string): boolean {
  if (isVisibleInventoryResource(itemId)) return false;
  return itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_");
}

/**
 * Moves materials from legacy saves out of the hero inventory.
 * Enchantment currencies and faction loot deliberately remain regular
 * inventory items.
 */
export function migrateLegacyProductionMaterials(
  inventoryManager: InventoryManager,
  heroId: EntityId,
  productionStorageId: EntityId,
): number {
  const quantities = new Map<string, number>();
  for (const slot of inventoryManager.listSlots(heroId)) {
    const entry = slot.entry;
    if (entry === undefined || !isProductionMaterial(entry.itemId)) continue;
    quantities.set(entry.itemId, (quantities.get(entry.itemId) ?? 0) + entry.quantity);
  }

  let moved = 0;
  for (const [itemId, quantity] of quantities) {
    if (!inventoryManager.canAcceptQuantity(productionStorageId, itemId, quantity)) {
      throw new Error(`Production storage cannot migrate ${itemId}`);
    }
    const added = inventoryManager.addQuantity(productionStorageId, itemId, quantity, {
      itemId,
      stackable: true,
      maxStack: 999,
    });
    if (!added.ok || added.value.remainder !== 0) {
      throw new Error(`Production storage migration failed for ${itemId}`);
    }
    const removed = inventoryManager.removeQuantity(heroId, itemId, quantity);
    if (!removed.ok) {
      inventoryManager.removeQuantity(productionStorageId, itemId, quantity);
      throw new Error(`Legacy inventory cleanup failed for ${itemId}`);
    }
    moved += quantity;
  }
  return moved;
}
