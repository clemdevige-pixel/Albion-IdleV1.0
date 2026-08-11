import {
  WEAPON_FAMILIES,
  resolveWeaponPresentation,
  type WeaponFamilyId,
  type WeaponPresentationContent,
} from "./weaponContentCatalog.js";

export type EquipmentPresentationDefinition = WeaponPresentationContent;

export interface WeaponFamilyCraftPresentation {
  readonly label: string;
  readonly symbol: string;
}

/**
 * Craft-family presentation is explicit presentation content, keyed by the
 * authoritative gameplay family IDs.
 */
const CRAFT_PRESENTATION_BY_WEAPON_FAMILY: Readonly<
  Record<WeaponFamilyId, WeaponFamilyCraftPresentation>
> = {
  sword: { label: WEAPON_FAMILIES.sword.name, symbol: "⚔" },
  bow: { label: WEAPON_FAMILIES.bow.name, symbol: "➶" },
  fire_staff: { label: WEAPON_FAMILIES.fire_staff.name, symbol: "◆" },
  gloves: { label: WEAPON_FAMILIES.gloves.name, symbol: "✦" },
  dagger: { label: WEAPON_FAMILIES.dagger.name, symbol: "††" },
};

/**
 * Equipped weapon presentation is authored directly on the authoritative
 * weapon specialization content. No specialization-specific routing lives here.
 */
export function resolveEquipmentPresentation(
  itemId: string | undefined,
): EquipmentPresentationDefinition | undefined {
  if (itemId === undefined) return undefined;
  return resolveWeaponPresentation(itemId);
}

export function resolveWeaponFamilyCraftPresentation(
  familyId: string,
): WeaponFamilyCraftPresentation | undefined {
  return CRAFT_PRESENTATION_BY_WEAPON_FAMILY[familyId as WeaponFamilyId];
}