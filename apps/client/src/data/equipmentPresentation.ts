import { resolveWeaponMastery } from "./weaponContentCatalog.js";

export interface EquipmentPresentationDefinition {
  readonly itemIcon: string;
  readonly actorManifestId: string;
  readonly combatProfileId: string;
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
