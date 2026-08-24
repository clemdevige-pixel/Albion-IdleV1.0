import { resolveWeaponMastery } from "./weaponContentCatalog.js";

/**
 * Inventory/crafting icon presentation is independent from combat actor art.
 * One icon is shared by every tier of the same weapon specialization.
 */
const WEAPON_ITEM_ICON_BY_SPECIALIZATION: Readonly<Record<string, string>> = {
  mastery_broadsword: "broadsword.png",
  mastery_clarent_blade: "clarent blade.png",
  mastery_carving_sword: "carving sword.png",
  mastery_galatine_pair: "galatine pair.png",
  mastery_claymore: "claymore.png",

  mastery_longbow: "longbow.png",
  mastery_badon: "badon bow.png",
  mastery_wailing_bow: "wailing bow.png",
  mastery_whispering_bow: "whispering bow.png",
  mastery_warbow: "warbow.png",

  mastery_infernal_staff: "infernal staff.png",
  mastery_wildfire_staff: "wildfire staff.png",
  mastery_blazing_staff: "blazing staff.png",
  mastery_brimstone_staff: "brimestone staff.png",
  mastery_great_fire_staff: "great fire staff.png",

  mastery_spiked_gauntlets: "spike.png",
  mastery_ursine_maulers: "ursine maulers.png",
  mastery_ravenstrike_cestus: "ravenstrike cestus.png",
  mastery_hellfire_hands: "hellfire hands.png",
  mastery_battle_bracers: "battle bracers.png",

  mastery_dagger_pair: "pair dagger.png",
  mastery_bloodletter: "bloodletter.png",
  mastery_demonfang: "demonfang.png",
  mastery_deathgivers: "deathgivers.png",
  mastery_claws: "claws.png",
};

export function resolveWeaponItemIcon(itemId: string | undefined): string | undefined {
  if (itemId === undefined) return undefined;
  const mastery = resolveWeaponMastery(itemId);
  if (mastery === undefined) return undefined;
  return WEAPON_ITEM_ICON_BY_SPECIALIZATION[mastery.weaponId];
}
