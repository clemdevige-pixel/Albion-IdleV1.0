import {
  WEAPON_FAMILIES,
  resolveWeaponPresentation,
  type WeaponFamilyId,
  type WeaponProjectilePresentation,
} from "./weaponContentCatalog.js";
import { resolveWeaponItemIcon } from "./weaponItemVisualCatalog.js";

export interface EquipmentPresentationDefinition {
  readonly itemIcon: string;
  readonly actorManifestId?: string;
  readonly combatProfileId?: string;
  readonly combatPresentation?: WeaponProjectilePresentation;
}

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
 * Item icon presentation is available for every authored weapon. Combat actor
 * presentation remains optional until the corresponding combat art exists.
 */
export function resolveEquipmentPresentation(
  itemId: string | undefined,
): EquipmentPresentationDefinition | undefined {
  const itemIcon = resolveWeaponItemIcon(itemId);
  if (itemIcon === undefined) return undefined;

  const combatPresentation = itemId === undefined
    ? undefined
    : resolveWeaponPresentation(itemId);

  return {
    itemIcon,
    ...(combatPresentation?.actorManifestId === undefined
      ? {}
      : { actorManifestId: combatPresentation.actorManifestId }),
    ...(combatPresentation?.combatProfileId === undefined
      ? {}
      : { combatProfileId: combatPresentation.combatProfileId }),
    ...(combatPresentation?.combatPresentation === undefined
      ? {}
      : { combatPresentation: combatPresentation.combatPresentation }),
  };
}

export function resolveWeaponFamilyCraftPresentation(
  familyId: string,
): WeaponFamilyCraftPresentation | undefined {
  return CRAFT_PRESENTATION_BY_WEAPON_FAMILY[familyId as WeaponFamilyId];
}
