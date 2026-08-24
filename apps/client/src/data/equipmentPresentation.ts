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

interface WeaponFamilyCombatPresentation {
  readonly actorManifestId: string;
  readonly combatProfileId: string;
  readonly combatPresentation?: WeaponProjectilePresentation;
}

/**
 * Temporary family combat art fallback. Specializations with authored combat
 * presentation always win; specializations without dedicated sheets reuse the
 * canonical family actor until their own presentation is authored.
 */
const COMBAT_PRESENTATION_BY_WEAPON_FAMILY: Readonly<
  Record<WeaponFamilyId, WeaponFamilyCombatPresentation>
> = {
  sword: {
    actorManifestId: "hero_broadsword",
    combatProfileId: "melee",
  },
  bow: {
    actorManifestId: "hero_longbow",
    combatProfileId: "projectile",
    combatPresentation: {
      kind: "projectile",
      projectileId: "arrow",
      releaseDelayMs: 355,
    },
  },
  fire_staff: {
    actorManifestId: "hero_fire_staff",
    combatProfileId: "projectile",
    combatPresentation: {
      kind: "projectile",
      projectileId: "fireball",
      releaseDelayMs: 355,
    },
  },
  gloves: {
    actorManifestId: "hero_spiked_gauntlets",
    combatProfileId: "melee",
  },
  dagger: {
    actorManifestId: "hero_dagger_pair",
    combatProfileId: "melee",
  },
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

function resolveCombatPresentation(itemId: string): WeaponFamilyCombatPresentation | undefined {
  const specializationPresentation = resolveWeaponPresentation(itemId);
  if (specializationPresentation !== undefined) return specializationPresentation;

  const familyId = resolveWeaponFamilyId(itemId);
  return familyId === undefined ? undefined : COMBAT_PRESENTATION_BY_WEAPON_FAMILY[familyId];
}

/**
 * Inventory icon presentation is authored per specialization. Combat actor art
 * resolves per specialization when available, otherwise through the family
 * fallback above.
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
