import type { EntityId } from "@game/core";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import { getEnchantmentLevel, type EnchantmentLevel } from "../inventory/types.js";

export interface CraftingRequirementLike {
  readonly itemId: string;
  readonly quantity: number;
}

export interface CraftingOutputLike {
  readonly itemId: string;
  readonly quantity?: number;
  readonly enchantment?: EnchantmentLevel;
}

function findSlotsFreedByRequirements(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  requirements: readonly CraftingRequirementLike[],
): readonly number[] {
  const totals = new Map<string, number>();
  for (const requirement of requirements) {
    totals.set(requirement.itemId, (totals.get(requirement.itemId) ?? 0) + requirement.quantity);
  }

  const freedPositions = new Set<number>();
  for (const [itemId, quantity] of totals) {
    const slots = inventoryManager.findEntriesByItemId(entityId, itemId);
    let remainingToRemove = quantity;
    for (const slot of slots) {
      if (remainingToRemove <= 0) break;
      if (slot.entry === undefined) continue;
      if (getEnchantmentLevel(slot.entry) !== 0) continue;
      const removed = Math.min(slot.entry.quantity, remainingToRemove);
      if (removed === slot.entry.quantity) {
        freedPositions.add(slot.position);
      }
      remainingToRemove -= removed;
    }
  }
  return [...freedPositions];
}

/**
 * Authoritative domain check for crafting eligibility:
 * 1. All required item quantities must be available in inventory.
 * 2. The authoritative inventory rules must be able to accept the result,
 *    including an existing compatible stack and slots released by inputs.
 */
export function canCraftRecipe(
  inventoryManager: InventoryManager,
  entityId: EntityId,
  requirements: readonly CraftingRequirementLike[],
  output?: CraftingOutputLike,
  resolveRequirementOwner: (itemId: string) => EntityId = () => entityId,
): boolean {
  for (const requirement of requirements) {
    if (
      inventoryManager.getTotalQuantity(
        resolveRequirementOwner(requirement.itemId),
        requirement.itemId,
      ) < requirement.quantity
    ) {
      return false;
    }
  }

  const slotsFreed = findSlotsFreedByRequirements(
    inventoryManager,
    entityId,
    requirements.filter(
      (requirement) => resolveRequirementOwner(requirement.itemId) === entityId,
    ),
  );

  if (output !== undefined) {
    return inventoryManager.canAcceptQuantity(
      entityId,
      output.itemId,
      output.quantity ?? 1,
      output.enchantment ?? 0,
      slotsFreed,
    );
  }

  return !inventoryManager.isFull(entityId) || slotsFreed.length > 0;
}
