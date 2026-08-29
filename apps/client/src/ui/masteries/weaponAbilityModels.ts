import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponAbilityUnlocks,
  resolveWeaponMastery,
  type WeaponAbilityUnlock,
} from "../../data/weaponContentCatalog";

const REPRESENTATIVE_ITEM_BY_SPECIALIZATION = new Map<string, string>();

for (const itemId of Object.keys(WEAPON_ITEM_DEFINITIONS)) {
  const mastery = resolveWeaponMastery(itemId);
  if (mastery === undefined || REPRESENTATIVE_ITEM_BY_SPECIALIZATION.has(mastery.weaponId)) continue;
  REPRESENTATIVE_ITEM_BY_SPECIALIZATION.set(mastery.weaponId, itemId);
}

/**
 * Presentation lookup only: derives a specialization's authored ability kit from the
 * canonical weapon catalog without maintaining a second mastery -> spell table.
 */
export function getWeaponAbilityUnlocksForMastery(
  specializationMasteryId: string,
): readonly WeaponAbilityUnlock[] {
  const itemId = REPRESENTATIVE_ITEM_BY_SPECIALIZATION.get(specializationMasteryId);
  return itemId === undefined ? [] : resolveWeaponAbilityUnlocks(itemId);
}
