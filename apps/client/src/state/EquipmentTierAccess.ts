import type { EntityId } from "@game/core";
import type { EquipmentManager } from "@game/gameplay";
import { getItemTier } from "../data/itemPower.js";

export interface EquippedTierAccessFacts {
  readonly hasWeapon: boolean;
  readonly highestEquippedTier?: number;
}

/** Shared equipment-tier facts used by tier-gated combat activities. */
export function getEquippedTierAccessFacts(
  equipmentManager: EquipmentManager,
  heroId: EntityId,
): EquippedTierAccessFacts {
  const equipped = [...equipmentManager.getEquipped(heroId).values()];
  const equippedTiers = equipped
    .map((entry) => getItemTier(entry.itemId))
    .filter((tier): tier is NonNullable<ReturnType<typeof getItemTier>> => tier !== undefined);
  const highestEquippedTier = equippedTiers.length === 0 ? undefined : Math.max(...equippedTiers);
  return {
    hasWeapon: equipmentManager.getEquippedItem(heroId, "weapon") !== undefined,
    ...(highestEquippedTier === undefined ? {} : { highestEquippedTier }),
  };
}
