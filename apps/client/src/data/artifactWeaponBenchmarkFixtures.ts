import { resolveEquipmentInfo } from "./itemContentCatalog.js";

export type ArtifactWeaponFamily = "sword" | "bow" | "fire_staff" | "gloves" | "dagger";
export type ArtifactBenchmarkTier = 4 | 5 | 6 | 7 | 8;

export interface ArtifactWeaponBenchmarkSpec {
  readonly family: ArtifactWeaponFamily;
  readonly label: string;
  readonly itemId: (tier: ArtifactBenchmarkTier) => string;
}

export interface T4ArtifactWeaponBenchmarkSpec {
  readonly family: ArtifactWeaponFamily;
  readonly label: string;
  readonly itemId: string;
}

export const ARTIFACT_BENCHMARK_MASTERY_BY_TIER = {
  4: 30,
  5: 36,
  6: 46,
  7: 56,
  8: 65,
} as const satisfies Readonly<Record<ArtifactBenchmarkTier, number>>;

export function artifactBenchmarkMasteryProfile(tier: ArtifactBenchmarkTier): {
  readonly familyMasteryLevel: number;
  readonly specializationMasteryLevel: number;
  readonly siblingSpecializationMasteryLevel: number;
} {
  const level = ARTIFACT_BENCHMARK_MASTERY_BY_TIER[tier];
  return {
    familyMasteryLevel: level,
    specializationMasteryLevel: level,
    siblingSpecializationMasteryLevel: level,
  };
}

export const ARTIFACT_BENCHMARK_MASTERY_PROFILE = artifactBenchmarkMasteryProfile(4);

export const ARTIFACT_WEAPON_BENCHMARK_SPECS: readonly ArtifactWeaponBenchmarkSpec[] = [
  { family: "sword", label: "Clarent Blade", itemId: (tier) => `item_weapon_sword_clarent_t${tier}` },
  { family: "sword", label: "Carving Sword", itemId: (tier) => `item_weapon_sword_carving_t${tier}` },
  { family: "sword", label: "Galatine Pair", itemId: (tier) => `item_weapon_sword_galatine_t${tier}` },
  { family: "sword", label: "Claymore", itemId: (tier) => `item_weapon_sword_claymore_t${tier}` },
  { family: "bow", label: "Bow of Badon", itemId: (tier) => `item_weapon_bow_t${tier}_badon` },
  { family: "bow", label: "Wailing Bow", itemId: (tier) => `item_weapon_bow_wailing_t${tier}` },
  { family: "bow", label: "Whispering Bow", itemId: (tier) => `item_weapon_bow_whispering_t${tier}` },
  { family: "bow", label: "Warbow", itemId: (tier) => `item_weapon_bow_warbow_t${tier}` },
  { family: "fire_staff", label: "Wildfire Staff", itemId: (tier) => `item_weapon_staff_wildfire_t${tier}` },
  { family: "fire_staff", label: "Blazing Staff", itemId: (tier) => `item_weapon_staff_blazing_t${tier}` },
  { family: "fire_staff", label: "Brimstone Staff", itemId: (tier) => `item_weapon_staff_brimstone_t${tier}` },
  { family: "fire_staff", label: "Great Fire Staff", itemId: (tier) => `item_weapon_staff_great_fire_t${tier}` },
  { family: "gloves", label: "Ursine Maulers", itemId: (tier) => `item_weapon_gloves_ursine_t${tier}` },
  { family: "gloves", label: "Ravenstrike Cestus", itemId: (tier) => `item_weapon_gloves_ravenstrike_t${tier}` },
  { family: "gloves", label: "Hellfire Hands", itemId: (tier) => `item_weapon_gloves_hellfire_t${tier}` },
  { family: "gloves", label: "Battle Bracers", itemId: (tier) => `item_weapon_gloves_battle_bracers_t${tier}` },
  { family: "dagger", label: "Bloodletter", itemId: (tier) => `item_weapon_dagger_bloodletter_t${tier}` },
  { family: "dagger", label: "Demonfang", itemId: (tier) => `item_weapon_dagger_demonfang_t${tier}` },
  { family: "dagger", label: "Deathgivers", itemId: (tier) => `item_weapon_dagger_deathgivers_t${tier}` },
  { family: "dagger", label: "Claws", itemId: (tier) => `item_weapon_dagger_claws_t${tier}` },
];

export const T4_ARTIFACT_WEAPONS: readonly T4ArtifactWeaponBenchmarkSpec[] = ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => ({
  family: weapon.family,
  label: weapon.label,
  itemId: weapon.itemId(4),
}));

export function artifactDungeonEquipment(
  weaponItemId: string,
  tier: ArtifactBenchmarkTier,
  dungeonFaction: string,
): readonly string[] {
  const items: string[] = [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    `item_cape_t${tier}_${dungeonFaction.toLowerCase()}`,
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${tier}_reinforced`);
  }
  return items;
}

export function t4ArtifactDungeonEquipment(weaponItemId: string, dungeonFaction: string): readonly string[] {
  return artifactDungeonEquipment(weaponItemId, 4, dungeonFaction);
}
