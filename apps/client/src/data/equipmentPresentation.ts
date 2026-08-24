import {
  WEAPON_FAMILIES,
  resolveWeaponFamilyId,
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
 * Family fallbacks reference the already-authored canonical weapon presentation
 * instead of duplicating actor/profile/projectile data here.
 */
const FALLBACK_PRESENTATION_ITEM_BY_WEAPON_FAMILY: Readonly<Record<WeaponFamilyId, string>> = {
  sword: "item_weapon_sword_t4_broadsword",
  bow: "item_weapon_bow_t4_longbow",
  fire_staff: "item_weapon_staff_t4_infernal",
  gloves: "item_weapon_gloves_t4_spiked_gauntlets",
  dagger: "item_weapon_dagger_t4_pair",
};

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

function resolveCombatPresentation(itemId: string) {
  const specializationPresentation = resolveWeaponPresentation(itemId);
  if (specializationPresentation !== undefined) return specializationPresentation;

  const familyId = resolveWeaponFamilyId(itemId);
  if (familyId === undefined) return undefined;
  return resolveWeaponPresentation(FALLBACK_PRESENTATION_ITEM_BY_WEAPON_FAMILY[familyId]);
}

/**
 * Inventory icon presentation is authored per specialization. Combat actor art
 * resolves per specialization when available; otherwise it reuses the canonical
 * presentation of that weapon family until dedicated sheets are authored.
 */
export function resolveEquipmentPresentation(
  itemId: string | undefined,
): EquipmentPresentationDefinition | undefined {
  const itemIcon = resolveWeaponItemIcon(itemId);
  if (itemIcon === undefined) return undefined;

  const combatPresentation = itemId === undefined
    ? undefined
    : resolveCombatPresentation(itemId);

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
