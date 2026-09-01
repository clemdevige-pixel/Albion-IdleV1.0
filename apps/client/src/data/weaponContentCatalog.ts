import {
  STANDARD_WEAPON_ABILITIES,
  type AuthoredWeaponAbilityAutoRule,
  type AuthoredWeaponAbilityDefinition,
  type AuthoredWeaponAbilityMechanic,
  type AuthoredWeaponAbilityMechanicsProfile,
} from "@game/data";
import {
  asMasteryId,
  WEAPON_MASTERY_XP,
  type AbilityDefinitionLike,
  type EquipmentInfoLike,
} from "@game/gameplay";
import type { ProductionTier } from "./productionFamilyCatalog.js";
import {
  FACTION_ARTIFACT_ABILITIES,
  FACTION_ARTIFACT_ADVANTAGE,
  FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER,
  FACTION_ARTIFACT_WEAPON_CONTENT,
  type ArtifactFaction,
  type FactionArtifactWeaponSpecializationContent,
} from "./factionArtifactWeaponContent.js";

export type WeaponCombatProfile = "dagger" | "sword" | "bow" | "staff" | "hammer" | "gloves";
export type AbilityAutoRule = AuthoredWeaponAbilityAutoRule;
export type AbilityMechanic = AuthoredWeaponAbilityMechanic;
export type AbilityMechanicsProfile = AuthoredWeaponAbilityMechanicsProfile;
export type AbilityAutoCastRule = AbilityAutoRule;
export type ClientAbilityDefinition = AuthoredWeaponAbilityDefinition & AbilityDefinitionLike;
export interface WeaponAbilityUnlock { readonly unlockMasteryLevel: number; readonly source: "family" | "specialization"; readonly ability: ClientAbilityDefinition; }
export interface WeaponCraftMaterial { readonly kind: "wood" | "metal" | "leather" | "cloth"; readonly quantity: number; }
export type WeaponCraftRule = { readonly kind: "standard"; readonly materials: readonly WeaponCraftMaterial[] } | { readonly kind: "artifact_pending" };

const ABILITIES = STANDARD_WEAPON_ABILITIES satisfies Readonly<Record<string, ClientAbilityDefinition>>;

export const WEAPON_FAMILIES = {
  sword: { masteryId: "mastery_sword", name: "Épées", sharedAbilities: [ABILITIES.swordHeroicStrike, ABILITIES.swordGuardBreaker] },
  bow: { masteryId: "mastery_bow", name: "Arcs", sharedAbilities: [ABILITIES.bowAimedShot, ABILITIES.bowPiercingArrow] },
  fire_staff: { masteryId: "mastery_fire_staff", name: "Bâtons de feu", sharedAbilities: [ABILITIES.fireFireball, ABILITIES.fireInfernalBurst] },
  gloves: { masteryId: "mastery_gloves", name: "Gants", sharedAbilities: [ABILITIES.glovesShockwave, ABILITIES.glovesBreakingCombo] },
  dagger: { masteryId: "mastery_dagger", name: "Dagues", sharedAbilities: [ABILITIES.daggerDoubleSlash, ABILITIES.daggerFlurry] },
} as const;
export type WeaponFamilyId = keyof typeof WEAPON_FAMILIES;
interface WeaponItemContent { readonly itemId: string; readonly tier: ProductionTier; readonly handling: EquipmentInfoLike["handling"]; readonly stats: EquipmentInfoLike["stats"]; readonly sellPrice: number; }
export interface WeaponProjectilePresentation { readonly kind: "projectile"; readonly projectileId: string; readonly releaseDelayMs: number; }
export interface WeaponPresentationContent { readonly itemIcon: string; readonly actorManifestId: string; readonly combatProfileId: string; readonly combatPresentation?: WeaponProjectilePresentation; }
interface WeaponSpecializationContent {
  readonly familyId: WeaponFamilyId;
  readonly specializationMasteryId: string;
  readonly specializationName: string;
  readonly combatProfile: WeaponCombatProfile;
  readonly attackSpeed: number;
  readonly presentation?: WeaponPresentationContent;
  readonly artifactFaction?: ArtifactFaction;
  readonly signatureAbility: ClientAbilityDefinition;
  readonly craft: WeaponCraftRule;
  readonly items: readonly WeaponItemContent[];
}

function importArtifactSpecialization(entry: FactionArtifactWeaponSpecializationContent): WeaponSpecializationContent {
  return {
    familyId: entry.familyId,
    specializationMasteryId: entry.specializationMasteryId,
    specializationName: entry.specializationName,
    combatProfile: entry.combatProfile,
    attackSpeed: entry.attackSpeed,
    artifactFaction: entry.artifactFaction,
    signatureAbility: entry.signatureAbility as unknown as ClientAbilityDefinition,
    craft: entry.craft,
    items: entry.items,
  };
}

// Damage values below are the actual authored weapon values used by runtime.
// There is no hidden handling multiplier: 1H/2H balance is explicit per weapon.
const WEAPON_CONTENT: readonly WeaponSpecializationContent[] = [
  { familyId: "sword", specializationMasteryId: "mastery_broadsword", specializationName: "Épée large", combatProfile: "sword", attackSpeed: 1.296, presentation: { itemIcon: "item-broadsword-pixel-v1.png", actorManifestId: "hero_broadsword", combatProfileId: "melee" }, signatureAbility: ABILITIES.broadswordExecution, craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] }, items: [{ itemId: "item_weapon_sword_t3_broadsword", tier: 3, handling: "one_handed", stats: { stat_physical_damage: 48 }, sellPrice: 70 }, { itemId: "item_weapon_sword_t4_broadsword", tier: 4, handling: "one_handed", stats: { stat_physical_damage: 86 }, sellPrice: 200 }, { itemId: "item_weapon_sword_t5_broadsword", tier: 5, handling: "one_handed", stats: { stat_physical_damage: 125 }, sellPrice: 500 }, { itemId: "item_weapon_sword_t6_broadsword", tier: 6, handling: "one_handed", stats: { stat_physical_damage: 181 }, sellPrice: 900 }, { itemId: "item_weapon_sword_t7_broadsword", tier: 7, handling: "one_handed", stats: { stat_physical_damage: 262 }, sellPrice: 1450 }, { itemId: "item_weapon_sword_t8_broadsword", tier: 8, handling: "one_handed", stats: { stat_physical_damage: 380 }, sellPrice: 2150 }] },
  { familyId: "bow", specializationMasteryId: "mastery_longbow", specializationName: "Arc long", combatProfile: "bow", attackSpeed: 1, presentation: { itemIcon: "item-longbow-pixel-v1.png", actorManifestId: "hero_longbow", combatProfileId: "projectile", combatPresentation: { kind: "projectile", projectileId: "arrow", releaseDelayMs: 355 } }, signatureAbility: ABILITIES.longbowDeadeye, craft: { kind: "standard", materials: [{ kind: "wood", quantity: 6 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 2 }] }, items: [{ itemId: "item_weapon_bow_t3_longbow", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 66.5 }, sellPrice: 70 }, { itemId: "item_weapon_bow_t4_longbow", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 105.14 }, sellPrice: 200 }, { itemId: "item_weapon_bow_t5_longbow", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 166.25 }, sellPrice: 500 }, { itemId: "item_weapon_bow_t6_longbow", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 241.3 }, sellPrice: 900 }, { itemId: "item_weapon_bow_t7_longbow", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 349.6 }, sellPrice: 1450 }, { itemId: "item_weapon_bow_t8_longbow", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 507.3 }, sellPrice: 2150 }] },
  { familyId: "bow", specializationMasteryId: "mastery_badon", specializationName: "Badon", combatProfile: "bow", attackSpeed: 1, artifactFaction: "Keeper", presentation: { itemIcon: "item-badon-pixel-v1.png", actorManifestId: "hero_bow", combatProfileId: "projectile", combatPresentation: { kind: "projectile", projectileId: "badon_arrow", releaseDelayMs: 355 } }, signatureAbility: ABILITIES.badonRagingStorm, craft: { kind: "artifact_pending" }, items: [{ itemId: "item_weapon_bow_t4_badon", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 121.8 }, sellPrice: 260 }, { itemId: "item_weapon_bow_t5_badon", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 177 }, sellPrice: 760 }, { itemId: "item_weapon_bow_t6_badon", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 257 }, sellPrice: 1260 }, { itemId: "item_weapon_bow_t7_badon", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 373 }, sellPrice: 1760 }, { itemId: "item_weapon_bow_t8_badon", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 541 }, sellPrice: 2260 }] },
  { familyId: "fire_staff", specializationMasteryId: "mastery_infernal_staff", specializationName: "Bâton Infernal", combatProfile: "staff", attackSpeed: 0.9, presentation: { itemIcon: "item-fire-staff-pixel-v1.png", actorManifestId: "hero_fire_staff", combatProfileId: "projectile", combatPresentation: { kind: "projectile", projectileId: "fireball", releaseDelayMs: 355 } }, signatureAbility: ABILITIES.infernalCataclysm, craft: { kind: "standard", materials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 4 }, { kind: "cloth", quantity: 2 }] }, items: [{ itemId: "item_weapon_staff_t3_infernal", tier: 3, handling: "two_handed", stats: { stat_magical_damage: 67.2 }, sellPrice: 80 }, { itemId: "item_weapon_staff_t4_infernal", tier: 4, handling: "two_handed", stats: { stat_magical_damage: 126 }, sellPrice: 220 }, { itemId: "item_weapon_staff_t5_infernal", tier: 5, handling: "two_handed", stats: { stat_magical_damage: 184.8 }, sellPrice: 540 }, { itemId: "item_weapon_staff_t6_infernal", tier: 6, handling: "two_handed", stats: { stat_magical_damage: 268 }, sellPrice: 950 }, { itemId: "item_weapon_staff_t7_infernal", tier: 7, handling: "two_handed", stats: { stat_magical_damage: 388.6 }, sellPrice: 1500 }, { itemId: "item_weapon_staff_t8_infernal", tier: 8, handling: "two_handed", stats: { stat_magical_damage: 563.5 }, sellPrice: 2200 }] },
  { familyId: "gloves", specializationMasteryId: "mastery_spiked_gauntlets", specializationName: "Gantelets à pointes", combatProfile: "gloves", attackSpeed: 1.204, presentation: { itemIcon: "item-spiked-gauntlets-pixel-v1.png", actorManifestId: "hero_spiked_gauntlets", combatProfileId: "melee" }, signatureAbility: ABILITIES.spikedSeismicImpact, craft: { kind: "standard", materials: [{ kind: "metal", quantity: 5 }, { kind: "leather", quantity: 3 }] }, items: [{ itemId: "item_weapon_gloves_t3_spiked_gauntlets", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 53.2 }, sellPrice: 75 }, { itemId: "item_weapon_gloves_t4_spiked_gauntlets", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 90 }, sellPrice: 210 }, { itemId: "item_weapon_gloves_t5_spiked_gauntlets", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 135 }, sellPrice: 520 }, { itemId: "item_weapon_gloves_t6_spiked_gauntlets", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 193 }, sellPrice: 920 }, { itemId: "item_weapon_gloves_t7_spiked_gauntlets", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 282.6 }, sellPrice: 1475 }, { itemId: "item_weapon_gloves_t8_spiked_gauntlets", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 409.8 }, sellPrice: 2175 }] },
  { familyId: "dagger", specializationMasteryId: "mastery_dagger_pair", specializationName: "Paire de dagues", combatProfile: "dagger", attackSpeed: 1.392, presentation: { itemIcon: "item-dagger-pair-pixel-v1.png", actorManifestId: "hero_dagger_pair", combatProfileId: "melee" }, signatureAbility: ABILITIES.daggerPairCrossAssault, craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] }, items: [{ itemId: "item_weapon_dagger_t3_pair", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 53.2 }, sellPrice: 75 }, { itemId: "item_weapon_dagger_t4_pair", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 81.2 }, sellPrice: 210 }, { itemId: "item_weapon_dagger_t5_pair", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 117.7 }, sellPrice: 520 }, { itemId: "item_weapon_dagger_t6_pair", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 170.7 }, sellPrice: 920 }, { itemId: "item_weapon_dagger_t7_pair", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 247.5 }, sellPrice: 1475 }, { itemId: "item_weapon_dagger_t8_pair", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 358.9 }, sellPrice: 2175 }] },
  ...FACTION_ARTIFACT_WEAPON_CONTENT.map(importArtifactSpecialization),
];

const ALL_ARTIFACT_ABILITIES = Object.values(FACTION_ARTIFACT_ABILITIES) as unknown as readonly ClientAbilityDefinition[];
export const CLIENT_ABILITIES: Readonly<Record<string, ClientAbilityDefinition>> = Object.fromEntries(
  [...Object.values(ABILITIES), ...ALL_ARTIFACT_ABILITIES].map((ability) => [ability.id, ability] as const),
);
export const WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(
  WEAPON_CONTENT.flatMap((entry) => entry.items).map((item) => [item.itemId, { itemId: item.itemId, slot: "weapon", handling: item.handling, stats: item.stats, enchantment: { enabled: item.tier >= 4, maximumLevel: item.tier >= 4 ? 3 : 0 } }] as const),
);
interface WeaponItemRoute { readonly specialization: WeaponSpecializationContent; readonly item: WeaponItemContent; }
const CONTENT_BY_ITEM_ID = new Map<string, WeaponItemRoute>(
  WEAPON_CONTENT.flatMap((specialization) => specialization.items.map((item) => [item.itemId, { specialization, item }] as const)),
);
export function resolveWeaponAbilityUnlocks(itemId: string | null | undefined): readonly WeaponAbilityUnlock[] {
  if (itemId == null) return [];
  const specialization = CONTENT_BY_ITEM_ID.get(itemId)?.specialization;
  if (specialization === undefined) return [];
  const family = WEAPON_FAMILIES[specialization.familyId];
  const [q, w] = family.sharedAbilities;
  return [
    ...(q === undefined ? [] : [{ unlockMasteryLevel: 1, source: "family" as const, ability: q }]),
    ...(w === undefined ? [] : [{ unlockMasteryLevel: 10, source: "family" as const, ability: w }]),
    { unlockMasteryLevel: 30, source: "specialization" as const, ability: specialization.signatureAbility },
  ];
}
export function resolveUnlockedWeaponAbilities(itemId: string | null | undefined, specializationMasteryLevel: number): readonly ClientAbilityDefinition[] {
  return resolveWeaponAbilityUnlocks(itemId).filter((entry) => specializationMasteryLevel >= entry.unlockMasteryLevel).sort((a, b) => a.unlockMasteryLevel - b.unlockMasteryLevel).map((entry) => entry.ability);
}
export function resolvePrimaryAbilityId(itemId: string | null | undefined): string | undefined { return resolveWeaponAbilityUnlocks(itemId)[0]?.ability.id; }
export interface WeaponMasteryRoute { readonly familyId: ReturnType<typeof asMasteryId>; readonly weaponId: ReturnType<typeof asMasteryId>; }
export function resolveWeaponMastery(itemId: string): WeaponMasteryRoute | undefined {
  const entry = CONTENT_BY_ITEM_ID.get(itemId)?.specialization;
  if (entry === undefined) return undefined;
  const family = WEAPON_FAMILIES[entry.familyId];
  return { familyId: asMasteryId(family.masteryId), weaponId: asMasteryId(entry.specializationMasteryId) };
}
export function resolveWeaponFamilyId(itemId: string): WeaponFamilyId | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.familyId; }
export function resolveWeaponTier(itemId: string): ProductionTier | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.item.tier; }
export function resolveWeaponPresentation(itemId: string): WeaponPresentationContent | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.presentation; }
export function resolveWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.combatProfile; }
export function resolveWeaponAttackSpeed(itemId: string): number | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.attackSpeed; }
export function resolveWeaponCraftRule(itemId: string): WeaponCraftRule | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.craft; }
export function resolveWeaponArtifactFaction(itemId: string): ArtifactFaction | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.artifactFaction; }
export function resolveArtifactDungeonDamageBonusPercent(itemId: string, dungeonFaction: string): number {
  const route = CONTENT_BY_ITEM_ID.get(itemId);
  const artifactFaction = route?.specialization.artifactFaction;
  if (artifactFaction === undefined || route === undefined) return 0;
  if (FACTION_ARTIFACT_ADVANTAGE[artifactFaction] !== dungeonFaction) return 0;
  return FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER[route.item.tier] ?? 0;
}
export function resolvePreviousWeaponTierItemId(itemId: string): string | undefined {
  const route = CONTENT_BY_ITEM_ID.get(itemId);
  if (route === undefined || route.item.tier < 4 || route.specialization.craft.kind !== "standard") return undefined;
  return route.specialization.items.find((item) => item.tier === route.item.tier - 1)?.itemId;
}
export function getWeaponSpecializationName(itemId: string): string | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.specializationName; }
export function getWeaponFamilyDisplayName(familyId: string): string | undefined { return WEAPON_FAMILIES[familyId as WeaponFamilyId]?.name; }
export interface WeaponMasteryFamilyDefinition { readonly familyId: WeaponFamilyId; readonly masteryId: string; readonly specializationMasteryIds: readonly string[]; }
export function getWeaponMasteryFamilyDefinitions(): readonly WeaponMasteryFamilyDefinition[] {
  return (Object.keys(WEAPON_FAMILIES) as WeaponFamilyId[]).map((familyId) => ({ familyId, masteryId: WEAPON_FAMILIES[familyId].masteryId, specializationMasteryIds: WEAPON_CONTENT.filter((entry) => entry.familyId === familyId).map((entry) => entry.specializationMasteryId) }));
}
const masteryNames = new Map<string, string>();
const familyMasteryIds = new Set<string>();
const specializationMasteryIds = new Set<string>();
for (const family of Object.values(WEAPON_FAMILIES)) {
  masteryNames.set(family.masteryId, family.name);
  familyMasteryIds.add(family.masteryId);
}
for (const entry of WEAPON_CONTENT) {
  masteryNames.set(entry.specializationMasteryId, entry.specializationName);
  specializationMasteryIds.add(entry.specializationMasteryId);
}
export function getWeaponMasteryDisplayName(masteryId: string): string | undefined { return masteryNames.get(masteryId); }
export const WEAPON_MASTERY_DEFINITIONS = [...familyMasteryIds, ...specializationMasteryIds].map((id) => ({ id, category: specializationMasteryIds.has(id) ? "weapon_specialization" : "weapon", maxLevel: 100, experiencePerLevel: WEAPON_MASTERY_XP }));
export const WEAPON_VENDOR_OFFERS = WEAPON_CONTENT.flatMap((entry) => entry.items.map((item) => ({ itemId: item.itemId, buyPrice: null, sellPrice: item.sellPrice, maxPerTransaction: null, enabled: true })));
