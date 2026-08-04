import type { EquipmentData } from "./components.js";
import { EQUIPMENT_SLOTS, type EquipmentInfoResolver, type EquipmentSlot } from "./types.js";

export function isValidSlot(slot: string): slot is EquipmentSlot {
  return (EQUIPMENT_SLOTS as readonly string[]).includes(slot);
}

export function validateEquipmentState(
  data: EquipmentData,
  resolveEquipmentInfo?: EquipmentInfoResolver,
): string[] {
  const errors: string[] = [];
  const seenInstanceIds = new Set<string>();

  for (const [slot, entry] of data.slots) {
    if (!isValidSlot(slot)) {
      errors.push(`Invalid equipment slot: "${String(slot)}"`);
    }
    if (seenInstanceIds.has(entry.instanceId)) {
      errors.push(`Duplicate instance id: ${entry.instanceId}`);
    }
    seenInstanceIds.add(entry.instanceId);
    if (entry.itemId.length === 0) {
      errors.push(`Entry ${entry.instanceId} has an empty itemId`);
    }
    if (entry.quantity !== 1) {
      errors.push(`Entry ${entry.instanceId} has invalid quantity ${String(entry.quantity)}`);
    }
    if (resolveEquipmentInfo !== undefined) {
      const info = resolveEquipmentInfo(entry.itemId);
      if (info === undefined) {
        errors.push(`Entry ${entry.instanceId} (${entry.itemId}) is not equippable`);
      } else if (info.slot !== slot) {
        errors.push(
          `Entry ${entry.instanceId} (${entry.itemId}) occupies slot "${String(slot)}" but belongs to "${info.slot}"`,
        );
      }
    }
  }

  if (resolveEquipmentInfo !== undefined && data.slots.has("off_hand")) {
    const weapon = data.slots.get("weapon");
    if (weapon !== undefined && resolveEquipmentInfo(weapon.itemId)?.handling === "two_handed") {
      errors.push("Off-hand equipped alongside a two-handed weapon (31_EQUIPMENT)");
    }
  }

  return errors;
}
