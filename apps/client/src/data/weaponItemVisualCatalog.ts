import { resolveWeaponMastery } from "./weaponContentCatalog.js";

/**
 * Inventory/crafting icon presentation is independent from combat actor art.
 * One normalized UI icon is shared by every tier of the same weapon specialization.
 * Source/master item art stays under /assets/items; UI thumbnails live under
 * /assets/items/icons/armes and are generated from the authored masters.
 */
const WEAPON_ITEM_ICON_BY_SPECIALIZATION: Readonly<Record<string, string>> = {
  mastery_broadsword: "icons/armes/broadsword.png",
  mastery_clarent_blade: "icons/armes/clarent blade.png",
  mastery_carving_sword: "icons/armes/carving sword.png",
  mastery_galatine_pair: "icons/armes/galatine pair.png",
  mastery_claymore: "icons/armes/claymore.png",

  mastery_longbow: "icons/armes/longbow.png",
  mastery_badon: "icons/armes/badon bow.png",
  mastery_wailing_bow: "icons/armes/wailing bow.png",
  mastery_whispering_bow: "icons/armes/whispering bow.png",
  mastery_warbow: "icons/armes/warbow.png",

  mastery_infernal_staff: "icons/armes/infernal staff.png",
  mastery_wildfire_staff: "icons/armes/wildfire staff.png",
  mastery_blazing_staff: "icons/armes/blazing staff.png",
  mastery_brimstone_staff: "icons/armes/brimestone staff.png",
  mastery_great_fire_staff: "icons/armes/great fire staff.png",

  mastery_spiked_gauntlets: "icons/armes/spike.png",
  mastery_ursine_maulers: "icons/armes/ursine maulers.png",
  mastery_ravenstrike_cestus: "icons/armes/ravenstrike cestus.png",
  mastery_hellfire_hands: "icons/armes/hellfire hands.png",
  mastery_battle_bracers: "icons/armes/battle bracers.png",

  mastery_dagger_pair: "icons/armes/pair dagger.png",
  mastery_bloodletter: "icons/armes/bloodletter.png",
  mastery_demonfang: "icons/armes/demonfang.png",
  mastery_deathgivers: "icons/armes/deathgivers.png",
  mastery_claws: "icons/armes/claws.png",
};

export function resolveWeaponItemIcon(itemId: string | undefined): string | undefined {
  if (itemId === undefined) return undefined;
  const mastery = resolveWeaponMastery(itemId);
  if (mastery === undefined) return undefined;
  return WEAPON_ITEM_ICON_BY_SPECIALIZATION[mastery.weaponId];
}
