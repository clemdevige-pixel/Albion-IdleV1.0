import type { ProductionTier } from "./production-balance.js";
import type { STANDARD_WEAPON_ABILITIES } from "./weapon-ability-content.js";

export type AuthoredWeaponFamilyId = "sword" | "bow" | "fire_staff" | "gloves" | "dagger";
export type AuthoredWeaponCombatProfile = "dagger" | "sword" | "bow" | "staff" | "hammer" | "gloves";
export type AuthoredWeaponHandling = "one_handed" | "two_handed";
export type AuthoredWeaponArtifactFaction = "Keeper" | "Morgana" | "Undead" | "Heretic";
export type AuthoredWeaponStatId = "stat_physical_damage" | "stat_magical_damage";

export interface AuthoredWeaponCraftMaterial {
  readonly kind: "wood" | "metal" | "leather" | "cloth";
  readonly quantity: number;
}

export type AuthoredWeaponCraftRule =
  | { readonly kind: "standard"; readonly materials: readonly AuthoredWeaponCraftMaterial[] }
  | { readonly kind: "artifact_pending" };

export interface AuthoredWeaponItemContent {
  readonly itemId: string;
  readonly tier: ProductionTier;
  readonly handling: AuthoredWeaponHandling;
  readonly stats: Readonly<Partial<Record<AuthoredWeaponStatId, number>>>;
  readonly sellPrice: number;
}

export interface AuthoredWeaponFamilyDefinition {
  readonly masteryId: string;
  readonly name: string;
  readonly sharedAbilityKeys: readonly [keyof typeof STANDARD_WEAPON_ABILITIES, keyof typeof STANDARD_WEAPON_ABILITIES];
}

export const STANDARD_WEAPON_FAMILIES = {
  sword: { masteryId: "mastery_sword", name: "Épées", sharedAbilityKeys: ["swordHeroicStrike", "swordGuardBreaker"] },
  bow: { masteryId: "mastery_bow", name: "Arcs", sharedAbilityKeys: ["bowAimedShot", "bowPiercingArrow"] },
  fire_staff: { masteryId: "mastery_fire_staff", name: "Bâtons de feu", sharedAbilityKeys: ["fireFireball", "fireInfernalBurst"] },
  gloves: { masteryId: "mastery_gloves", name: "Gants", sharedAbilityKeys: ["glovesShockwave", "glovesBreakingCombo"] },
  dagger: { masteryId: "mastery_dagger", name: "Dagues", sharedAbilityKeys: ["daggerDoubleSlash", "daggerFlurry"] },
} as const satisfies Readonly<Record<AuthoredWeaponFamilyId, AuthoredWeaponFamilyDefinition>>;

export interface AuthoredWeaponSpecializationContent {
  readonly familyId: AuthoredWeaponFamilyId;
  readonly specializationMasteryId: string;
  readonly specializationName: string;
  readonly combatProfile: AuthoredWeaponCombatProfile;
  readonly attackSpeed: number;
  readonly artifactFaction?: AuthoredWeaponArtifactFaction;
  readonly signatureAbilityKey: keyof typeof STANDARD_WEAPON_ABILITIES;
  readonly craft: AuthoredWeaponCraftRule;
  readonly items: readonly AuthoredWeaponItemContent[];
}

/**
 * Canonical authored balance/content for the standard weapon surface currently shipped by the client.
 * Presentation assets remain client-owned and are joined by specializationMasteryId.
 */
export const STANDARD_WEAPON_CONTENT = [
  {
    familyId: "sword",
    specializationMasteryId: "mastery_broadsword",
    specializationName: "Épée large",
    combatProfile: "sword",
    attackSpeed: 1.296,
    signatureAbilityKey: "broadswordExecution",
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] },
    items: [
      { itemId: "item_weapon_sword_t3_broadsword", tier: 3, handling: "one_handed", stats: { stat_physical_damage: 48 }, sellPrice: 70 },
      { itemId: "item_weapon_sword_t4_broadsword", tier: 4, handling: "one_handed", stats: { stat_physical_damage: 86 }, sellPrice: 200 },
      { itemId: "item_weapon_sword_t5_broadsword", tier: 5, handling: "one_handed", stats: { stat_physical_damage: 125 }, sellPrice: 500 },
      { itemId: "item_weapon_sword_t6_broadsword", tier: 6, handling: "one_handed", stats: { stat_physical_damage: 181 }, sellPrice: 900 },
      { itemId: "item_weapon_sword_t7_broadsword", tier: 7, handling: "one_handed", stats: { stat_physical_damage: 262 }, sellPrice: 1450 },
      { itemId: "item_weapon_sword_t8_broadsword", tier: 8, handling: "one_handed", stats: { stat_physical_damage: 380 }, sellPrice: 2150 },
    ],
  },
  {
    familyId: "bow",
    specializationMasteryId: "mastery_longbow",
    specializationName: "Arc long",
    combatProfile: "bow",
    attackSpeed: 1,
    signatureAbilityKey: "longbowDeadeye",
    craft: { kind: "standard", materials: [{ kind: "wood", quantity: 6 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 2 }] },
    items: [
      { itemId: "item_weapon_bow_t3_longbow", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 66.5 }, sellPrice: 70 },
      { itemId: "item_weapon_bow_t4_longbow", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 105.14 }, sellPrice: 200 },
      { itemId: "item_weapon_bow_t5_longbow", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 166.25 }, sellPrice: 500 },
      { itemId: "item_weapon_bow_t6_longbow", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 241.3 }, sellPrice: 900 },
      { itemId: "item_weapon_bow_t7_longbow", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 349.6 }, sellPrice: 1450 },
      { itemId: "item_weapon_bow_t8_longbow", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 507.3 }, sellPrice: 2150 },
    ],
  },
  {
    familyId: "bow",
    specializationMasteryId: "mastery_badon",
    specializationName: "Badon",
    combatProfile: "bow",
    attackSpeed: 1,
    artifactFaction: "Keeper",
    signatureAbilityKey: "badonRagingStorm",
    craft: { kind: "artifact_pending" },
    items: [
      { itemId: "item_weapon_bow_t4_badon", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 121.8 }, sellPrice: 260 },
      { itemId: "item_weapon_bow_t5_badon", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 177 }, sellPrice: 760 },
      { itemId: "item_weapon_bow_t6_badon", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 257 }, sellPrice: 1260 },
      { itemId: "item_weapon_bow_t7_badon", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 373 }, sellPrice: 1760 },
      { itemId: "item_weapon_bow_t8_badon", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 541 }, sellPrice: 2260 },
    ],
  },
  {
    familyId: "fire_staff",
    specializationMasteryId: "mastery_infernal_staff",
    specializationName: "Bâton Infernal",
    combatProfile: "staff",
    attackSpeed: 0.9,
    signatureAbilityKey: "infernalCataclysm",
    craft: { kind: "standard", materials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 4 }, { kind: "cloth", quantity: 2 }] },
    items: [
      { itemId: "item_weapon_staff_t3_infernal", tier: 3, handling: "two_handed", stats: { stat_magical_damage: 67.2 }, sellPrice: 80 },
      { itemId: "item_weapon_staff_t4_infernal", tier: 4, handling: "two_handed", stats: { stat_magical_damage: 126 }, sellPrice: 220 },
      { itemId: "item_weapon_staff_t5_infernal", tier: 5, handling: "two_handed", stats: { stat_magical_damage: 184.8 }, sellPrice: 540 },
      { itemId: "item_weapon_staff_t6_infernal", tier: 6, handling: "two_handed", stats: { stat_magical_damage: 268 }, sellPrice: 950 },
      { itemId: "item_weapon_staff_t7_infernal", tier: 7, handling: "two_handed", stats: { stat_magical_damage: 388.6 }, sellPrice: 1500 },
      { itemId: "item_weapon_staff_t8_infernal", tier: 8, handling: "two_handed", stats: { stat_magical_damage: 563.5 }, sellPrice: 2200 },
    ],
  },
  {
    familyId: "gloves",
    specializationMasteryId: "mastery_spiked_gauntlets",
    specializationName: "Gantelets à pointes",
    combatProfile: "gloves",
    attackSpeed: 1.204,
    signatureAbilityKey: "spikedSeismicImpact",
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 5 }, { kind: "leather", quantity: 3 }] },
    items: [
      { itemId: "item_weapon_gloves_t3_spiked_gauntlets", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 53.2 }, sellPrice: 75 },
      { itemId: "item_weapon_gloves_t4_spiked_gauntlets", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 90 }, sellPrice: 210 },
      { itemId: "item_weapon_gloves_t5_spiked_gauntlets", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 135 }, sellPrice: 520 },
      { itemId: "item_weapon_gloves_t6_spiked_gauntlets", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 193 }, sellPrice: 920 },
      { itemId: "item_weapon_gloves_t7_spiked_gauntlets", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 282.6 }, sellPrice: 1475 },
      { itemId: "item_weapon_gloves_t8_spiked_gauntlets", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 409.8 }, sellPrice: 2175 },
    ],
  },
  {
    familyId: "dagger",
    specializationMasteryId: "mastery_dagger_pair",
    specializationName: "Paire de dagues",
    combatProfile: "dagger",
    attackSpeed: 1.392,
    signatureAbilityKey: "daggerPairCrossAssault",
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] },
    items: [
      { itemId: "item_weapon_dagger_t3_pair", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 53.2 }, sellPrice: 75 },
      { itemId: "item_weapon_dagger_t4_pair", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 81.2 }, sellPrice: 210 },
      { itemId: "item_weapon_dagger_t5_pair", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 117.7 }, sellPrice: 520 },
      { itemId: "item_weapon_dagger_t6_pair", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 170.7 }, sellPrice: 920 },
      { itemId: "item_weapon_dagger_t7_pair", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 247.5 }, sellPrice: 1475 },
      { itemId: "item_weapon_dagger_t8_pair", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 358.9 }, sellPrice: 2175 },
    ],
  },
] as const satisfies readonly AuthoredWeaponSpecializationContent[];
