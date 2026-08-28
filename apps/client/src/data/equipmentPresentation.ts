import {
  WEAPON_FAMILIES,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
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

/** Dedicated combat actor overrides for authored specialization sheets. */
const SPECIALIZATION_COMBAT_PRESENTATION: Readonly<
  Record<string, Omit<EquipmentPresentationDefinition, "itemIcon">>
> = {
  mastery_badon: {
    actorManifestId: "hero_badon",
  },
  mastery_wailing_bow: {
    actorManifestId: "hero_wailing",
  },
  mastery_whispering_bow: {
    actorManifestId: "hero_whispering",
  },
  mastery_warbow: {
    actorManifestId: "hero_warbow",
  },
  mastery_infernal_staff: {
    actorManifestId: "hero_infernal",
  },
  mastery_wildfire_staff: {
    actorManifestId: "hero_wildfire",
  },
  mastery_blazing_staff: {
    actorManifestId: "hero_blazing",
  },
  mastery_brimstone_staff: {
    actorManifestId: "hero_brimstone",
  },
  mastery_great_fire_staff: {
    actorManifestId: "hero_great_fire",
  },
  mastery_ursine_maulers: {
    actorManifestId: "hero_ursine_maulers",
  },
  mastery_ravenstrike_cestus: {
    actorManifestId: "hero_ravenstrike_cestus",
  },
  mastery_hellfire_hands: {
    actorManifestId: "hero_hellfire_hands",
  },
  mastery_battle_bracers: {
    actorManifestId: "hero_battle_bracers",
  },
  mastery_bloodletter: {
    actorManifestId: "hero_bloodletter",
  },
  mastery_demonfang: {
    actorManifestId: "hero_demonfang",
  },
  mastery_deathgivers: {
    actorManifestId: "hero_deathgivers",
  },
  mastery_claws: {
    actorManifestId: "hero_claws",
  },
};

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
  const specializationMasteryId = resolveWeaponMastery(itemId)?.weaponId;
  const specializationPresentation = resolveWeaponPresentation(itemId);
  const familyId = resolveWeaponFamilyId(itemId);
  const inheritedPresentation = specializationPresentation
    ?? (familyId === undefined
      ? undefined
      : resolveWeaponPresentation(FALLBACK_PRESENTATION_ITEM_BY_WEAPON_FAMILY[familyId]));

  if (specializationMasteryId === undefined) return inheritedPresentation;
  const override = SPECIALIZATION_COMBAT_PRESENTATION[specializationMasteryId];
  if (override === undefined) return inheritedPresentation;

  return {
    ...inheritedPresentation,
    ...override,
  };
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
