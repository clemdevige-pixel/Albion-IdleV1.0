import {
  WEAPON_FAMILIES,
  resolveWeaponMastery,
  type WeaponFamilyId,
} from "./weaponContentCatalog.js";

export interface EquipmentPresentationDefinition {
  readonly itemIcon: string;
  readonly actorManifestId: string;
  readonly combatProfileId: string;
}

export interface WeaponFamilyCraftPresentation {
  readonly label: string;
  readonly symbol: string;
}

/**
 * Presentation is authored once per weapon specialization, not once per tier.
 * Gameplay identity stays in weaponContentCatalog; this catalog owns only
 * explicit visual/runtime presentation choices.
 */
const PRESENTATION_BY_SPECIALIZATION: Readonly<
  Record<string, EquipmentPresentationDefinition>
> = {
  mastery_broadsword: {
    itemIcon: "item-broadsword-pixel-v1.png",
    actorManifestId: "hero_broadsword",
    combatProfileId: "melee",
  },
  mastery_longbow: {
    itemIcon: "item-longbow-pixel-v1.png",
    actorManifestId: "hero_bow",
    combatProfileId: "bow",
  },
  mastery_badon: {
    itemIcon: "item-badon-pixel-v1.png",
    actorManifestId: "hero_bow",
    combatProfileId: "badon",
  },
  mastery_t4_fire_staff: {
    itemIcon: "item-fire-staff-pixel-v1.png",
    actorManifestId: "hero_fire_staff",
    combatProfileId: "fire_staff",
  },
  mastery_spiked_gauntlets: {
    itemIcon: "item-spiked-gauntlets-pixel-v1.png",
    actorManifestId: "hero_spiked_gauntlets",
    combatProfileId: "melee",
  },
  // Temporary visual fallback until the dedicated Dagger Pair asset/manifests exist.
  // Gameplay already uses the dagger combat profile; only the sprite/icon is borrowed.
  mastery_dagger_pair: {
    itemIcon: "item-broadsword-pixel-v1.png",
    actorManifestId: "hero_broadsword",
    combatProfileId: "melee",
  },
};

/**
 * Craft-family presentation is explicit presentation content, but it is keyed
 * by the authoritative family IDs. Adding a gameplay family therefore forces
 * its presentation to be declared here instead of editing the crafting UI.
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

/** Presentation metadata boundary for equipped weapons and item visuals. */
export function resolveEquipmentPresentation(
  itemId: string | undefined,
): EquipmentPresentationDefinition | undefined {
  if (itemId === undefined) return undefined;
  const mastery = resolveWeaponMastery(itemId);
  if (mastery === undefined) return undefined;
  return PRESENTATION_BY_SPECIALIZATION[mastery.weaponId];
}

export function resolveWeaponFamilyCraftPresentation(
  familyId: string,
): WeaponFamilyCraftPresentation | undefined {
  return CRAFT_PRESENTATION_BY_WEAPON_FAMILY[familyId as WeaponFamilyId];
}
