import type { EquipmentVM, MasteryVM } from "../../game/GameBridge";
import { getEffectiveItemPower } from "../../data/itemPower";

export function calculateAverageEquippedItemPower(
  equipment: EquipmentVM,
  masteries: readonly MasteryVM[],
): number {
  const itemPowers = equipment.slots
    .map((slot) => slot.itemId === undefined
      ? undefined
      : getEffectiveItemPower(slot.itemId, masteries, slot.enchantment))
    .filter((value): value is number => value !== undefined);

  if (itemPowers.length === 0) return 0;
  const average = itemPowers.reduce((sum, value) => sum + value, 0) / itemPowers.length;
  return Math.round(average * 10) / 10;
}
