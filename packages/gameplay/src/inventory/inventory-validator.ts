import type { InventoryData } from "./components.js";
import {
  effectiveMaxStack,
  getEnchantmentLevel,
  isEnchantmentLevel,
  type BagInfoResolver,
  type StackInfoResolver,
} from "./types.js";

export function validateInventory(
  data: InventoryData,
  resolveStackInfo?: StackInfoResolver,
  resolveBagInfo?: BagInfoResolver,
): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
    errors.push(`Invalid capacity: ${String(data.capacity)}`);
  }

  // Current capacity = base + active bag bonus (12_INVENTORY §4).
  let capacity = data.capacity;
  const seenInstanceIds = new Set<string>();
  if (data.activeBag !== undefined) {
    const bag = data.activeBag;
    seenInstanceIds.add(bag.instanceId);
    if (bag.itemId.length === 0) {
      errors.push(`Active bag ${bag.instanceId} has an empty itemId`);
    }
    if (bag.quantity !== 1) {
      errors.push(`Active bag ${bag.instanceId} has invalid quantity ${String(bag.quantity)}`);
    }
    if (resolveBagInfo !== undefined) {
      const info = resolveBagInfo(bag.itemId);
      if (info === undefined) {
        errors.push(`Active bag ${bag.instanceId} (${bag.itemId}) is not a bag`);
      } else {
        capacity += info.capacityBonus;
      }
    }
  }

  if (data.slots.size > capacity) {
    errors.push(
      `Occupied slots (${String(data.slots.size)}) exceed capacity (${String(capacity)})`,
    );
  }

  for (const [position, entry] of data.slots) {
    if (!Number.isInteger(position) || position < 0 || position >= capacity) {
      errors.push(`Entry ${entry.instanceId} occupies invalid position ${String(position)}`);
    }
    if (seenInstanceIds.has(entry.instanceId)) {
      errors.push(`Duplicate instance id: ${entry.instanceId}`);
    }
    seenInstanceIds.add(entry.instanceId);
    if (entry.itemId.length === 0) {
      errors.push(`Entry ${entry.instanceId} has an empty itemId`);
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      errors.push(`Entry ${entry.instanceId} has invalid quantity ${String(entry.quantity)}`);
    } else if (resolveStackInfo !== undefined) {
      const info = resolveStackInfo(entry.itemId);
      if (info !== undefined && entry.quantity > effectiveMaxStack(info)) {
        errors.push(
          `Entry ${entry.instanceId} quantity ${String(entry.quantity)} exceeds max stack ${String(effectiveMaxStack(info))}`,
        );
      }
    }
    if (!isEnchantmentLevel(getEnchantmentLevel(entry))) {
      errors.push(
        `Entry ${entry.instanceId} has invalid enchantment ${String(entry.enchantment)}`,
      );
    }
  }

  if (!Number.isInteger(data.nextInstanceCounter) || data.nextInstanceCounter < 0) {
    errors.push(`Invalid instance counter: ${String(data.nextInstanceCounter)}`);
  }

  return errors;
}
