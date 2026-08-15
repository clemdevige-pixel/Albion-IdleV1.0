import type { EquipmentInfoLike } from "@game/gameplay";
import { getWeaponSpecializationName, resolveWeaponPresentation, resolveWeaponTier, WEAPON_ITEM_DEFINITIONS } from "./weaponContentCatalog.js";

export const STARTER_TIER = 3 as const;

export interface StarterWeaponOption {
  readonly itemId: string;
  readonly label: string;
  readonly handling: EquipmentInfoLike["handling"];
  readonly itemIcon: string | undefined;
}

/**
 * Starter eligibility is derived from authoritative weapon content:
 * every weapon with a real T3 item is offered, artifact-only T4+ weapons are
 * excluded naturally without a second hand-maintained allow-list.
 */
export function getStarterWeaponOptions(): readonly StarterWeaponOption[] {
  return Object.values(WEAPON_ITEM_DEFINITIONS)
    .filter((definition) => resolveWeaponTier(definition.itemId) === STARTER_TIER)
    .map((definition) => ({
      itemId: definition.itemId,
      label: getWeaponSpecializationName(definition.itemId) ?? definition.itemId,
      handling: definition.handling,
      itemIcon: resolveWeaponPresentation(definition.itemId)?.itemIcon,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function getStarterLoadoutItemIds(weaponItemId: string): readonly string[] | undefined {
  const weapon = getStarterWeaponOptions().find((option) => option.itemId === weaponItemId);
  if (weapon === undefined) return undefined;

  return [weapon.itemId];
}
