import type { EntityId } from "@game/core";
import type { InventoryManager } from "../inventory/inventory-manager.js";

export interface CraftingRequirementLike {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * Authoritative domain check for crafting eligibility:
 * 1. Inventory must not be full.
 * 2. All required item quantities must be available in inventory.
 */
export function canCraftRecipe(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  requirements: readonly CraftingRequirementLike[],
): boolean {
  if (inventoryManager.isFull(entityId)) {
    return false;
  }
  for (const requirement of requirements) {
    if (
      inventoryManager.getTotalQuantity(entityId, requirement.itemId) < requirement.quantity
    ) {
      return false;
    }
  }
  return true;
}
