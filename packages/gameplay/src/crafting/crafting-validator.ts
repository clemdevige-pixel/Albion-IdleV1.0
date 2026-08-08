import type { EntityId } from "@game/core";
import type { InventoryManager } from "../inventory/inventory-manager.js";

export interface CraftingRequirementLike {
  readonly itemId: string;
  readonly quantity: number;
}

function willRemoveFreeSlot(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  requirements: readonly CraftingRequirementLike[],
): boolean {
  for (const requirement of requirements) {
    const slots = inventoryManager.findEntriesByItemId(entityId, requirement.itemId);
    let remainingToRemove = requirement.quantity;
    for (const slot of slots) {
      if (remainingToRemove <= 0) break;
      if (slot.entry === undefined) continue;
      if (slot.entry.quantity <= remainingToRemove) {
        return true;
      }
      remainingToRemove -= slot.entry.quantity;
    }
  }
  return false;
}

/**
 * Authoritative domain check for crafting eligibility:
 * 1. All required item quantities must be available in inventory.
 * 2. Inventory must either have a free slot OR consuming requirements will completely empty at least one occupied slot.
 */
export function canCraftRecipe(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  requirements: readonly CraftingRequirementLike[],
): boolean {
  for (const requirement of requirements) {
    if (
      inventoryManager.getTotalQuantity(entityId, requirement.itemId) < requirement.quantity
    ) {
      return false;
    }
  }

  if (!inventoryManager.isFull(entityId)) {
    return true;
  }

  return willRemoveFreeSlot(inventoryManager, entityId, requirements);
}
