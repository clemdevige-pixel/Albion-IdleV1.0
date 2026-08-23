import { resolveEquipmentInfo } from "./itemContentCatalog.js";

export type ArtifactWeaponFamily = "sword" | "bow" | "fire_staff" | "gloves" | "dagger";

export interface T4ArtifactWeaponBenchmarkSpec {
  readonly family: ArtifactWeaponFamily;
  readonly label: string;
  readonly itemId: string;
}

export const ARTIFACT_BENCHMARK_MASTERY_PROFILE = {
  familyMasteryLevel: 30,
  specializationMasteryLevel: 30,
  siblingSpecializationMasteryLevel: 30,
} as const;

export const T4_ARTIFACT_WEAPONS: readonly T4ArtifactWeaponBenchmarkSpec[] = [
  { family: "sword", label: "Clarent Blade", itemId: "item_weapon_sword_clarent_t4" },
  { family: "sword", label: "Carving Sword", itemId: "item_weapon_sword_carving_t4" },
  { family: "sword", label: "Galatine Pair", itemId: "item_weapon_sword_galatine_t4" },
  { family: "sword", label: "Claymore", itemId: "item_weapon_sword_claymore_t4" },
  { family: "bow", label: "Bow of Badon", itemId: "item_weapon_bow_t4_badon" },
  { family: "bow", label: "Wailing Bow", itemId: "item_weapon_bow_wailing_t4" },
  { family: "bow", label: "Whispering Bow", itemId: "item_weapon_bow_whispering_t4" },
  { family: "bow", label: "Warbow", itemId: "item_weapon_bow_warbow_t4" },
  { family: "fire_staff", label: "Wildfire Staff", itemId: "item_weapon_staff_wildfire_t4" },
  { family: "fire_staff", label: "Blazing Staff", itemId: "item_weapon_staff_blazing_t4" },
  { family: "fire_staff", label: "Brimstone Staff", itemId: "item_weapon_staff_brimstone_t4" },
  { family: "fire_staff", label: "Great Fire Staff", itemId: "item_weapon_staff_great_fire_t4" },
  { family: "gloves", label: "Ursine Maulers", itemId: "item_weapon_gloves_ursine_t4" },
  { family: "gloves", label: "Ravenstrike Cestus", itemId: "item_weapon_gloves_ravenstrike_t4" },
  { family: "gloves", label: "Hellfire Hands", itemId: "item_weapon_gloves_hellfire_t4" },
  { family: "gloves", label: "Battle Bracers", itemId: "item_weapon_gloves_battle_bracers_t4" },
  { family: "dagger", label: "Bloodletter", itemId: "item_weapon_dagger_bloodletter_t4" },
  { family: "dagger", label: "Demonfang", itemId: "item_weapon_dagger_demonfang_t4" },
  { family: "dagger", label: "Deathgivers", itemId: "item_weapon_dagger_deathgivers_t4" },
  { family: "dagger", label: "Claws", itemId: "item_weapon_dagger_claws_t4" },
];

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

export function t4ArtifactDungeonEquipment(weaponItemId: string, dungeonFaction: string): readonly string[] {
  const items: string[] = [...T4_ARMOR, `item_cape_t4_${dungeonFaction.toLowerCase()}`];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}
