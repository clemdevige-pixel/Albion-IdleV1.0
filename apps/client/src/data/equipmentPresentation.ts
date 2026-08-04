export interface EquipmentPresentationDefinition {
  readonly actorManifestId: string;
  readonly combatProfileId: string;
}

const SWORD_PRESENTATION: EquipmentPresentationDefinition = {
    actorManifestId: "hero_broadsword",
    combatProfileId: "melee",
};
const BOW_PRESENTATION: EquipmentPresentationDefinition = {
    actorManifestId: "hero_bow",
    combatProfileId: "bow",
};
const FIRE_STAFF_PRESENTATION: EquipmentPresentationDefinition = {
    actorManifestId: "hero_fire_staff",
    combatProfileId: "fire_staff",
};
const SPIKED_GAUNTLETS_PRESENTATION: EquipmentPresentationDefinition = {
    actorManifestId: "hero_spiked_gauntlets",
    combatProfileId: "melee",
};

const PRESENTATION_BY_ITEM_ID: Readonly<
  Record<string, EquipmentPresentationDefinition>
> = {
  item_weapon_sword_t3_broadsword: SWORD_PRESENTATION,
  item_weapon_sword_t4_broadsword: SWORD_PRESENTATION,
  item_weapon_bow_t3_longbow: BOW_PRESENTATION,
  item_weapon_bow_t4_longbow: BOW_PRESENTATION,
  item_weapon_bow_t4_badon: {
    actorManifestId: "hero_bow",
    combatProfileId: "badon",
  },
  item_weapon_staff_t3_fire: FIRE_STAFF_PRESENTATION,
  item_weapon_staff_t4_fire: FIRE_STAFF_PRESENTATION,
  item_weapon_gloves_t3_spiked_gauntlets: SPIKED_GAUNTLETS_PRESENTATION,
  item_weapon_gloves_t4_spiked_gauntlets: SPIKED_GAUNTLETS_PRESENTATION,
};

/** Presentation metadata boundary for equipped weapons. */
export function resolveEquipmentPresentation(
  itemId: string | undefined,
): EquipmentPresentationDefinition | undefined {
  if (itemId === undefined) return undefined;
  return PRESENTATION_BY_ITEM_ID[itemId];
}
