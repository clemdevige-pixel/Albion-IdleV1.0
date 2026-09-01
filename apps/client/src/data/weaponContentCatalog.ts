import {
  STANDARD_WEAPON_ABILITIES,
  STANDARD_WEAPON_CONTENT,
  STANDARD_WEAPON_FAMILIES,
  type AuthoredWeaponAbilityAutoRule,
  type AuthoredWeaponAbilityDefinition,
  type AuthoredWeaponAbilityMechanic,
  type AuthoredWeaponAbilityMechanicsProfile,
  type AuthoredWeaponCombatProfile,
  type AuthoredWeaponCraftMaterial,
  type AuthoredWeaponCraftRule,
  type AuthoredWeaponFamilyId,
  type AuthoredWeaponItemContent,
  type AuthoredWeaponSpecializationContent,
} from "@game/data";
import {
  asMasteryId,
  WEAPON_MASTERY_XP,
  type AbilityDefinitionLike,
  type EquipmentInfoLike,
} from "@game/gameplay";
import {
  FACTION_ARTIFACT_ABILITIES,
  FACTION_ARTIFACT_ADVANTAGE,
  FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER,
  FACTION_ARTIFACT_WEAPON_CONTENT,
  type ArtifactFaction,
  type FactionArtifactWeaponSpecializationContent,
} from "./factionArtifactWeaponContent.js";

export type WeaponCombatProfile = AuthoredWeaponCombatProfile;
export type AbilityAutoRule = AuthoredWeaponAbilityAutoRule;
export type AbilityMechanic = AuthoredWeaponAbilityMechanic;
export type AbilityMechanicsProfile = AuthoredWeaponAbilityMechanicsProfile;
export type AbilityAutoCastRule = AbilityAutoRule;
export type ClientAbilityDefinition = AuthoredWeaponAbilityDefinition & AbilityDefinitionLike;
export interface WeaponAbilityUnlock { readonly unlockMasteryLevel: number; readonly source: "family" | "specialization"; readonly ability: ClientAbilityDefinition; }
export type WeaponCraftMaterial = AuthoredWeaponCraftMaterial;
export type WeaponCraftRule = AuthoredWeaponCraftRule;

const ABILITIES = STANDARD_WEAPON_ABILITIES satisfies Readonly<Record<string, ClientAbilityDefinition>>;

function familyAbilities(familyId: AuthoredWeaponFamilyId): readonly [ClientAbilityDefinition, ClientAbilityDefinition] {
  const [first, second] = STANDARD_WEAPON_FAMILIES[familyId].sharedAbilityKeys;
  return [ABILITIES[first], ABILITIES[second]];
}

export const WEAPON_FAMILIES = {
  sword: { masteryId: STANDARD_WEAPON_FAMILIES.sword.masteryId, name: STANDARD_WEAPON_FAMILIES.sword.name, sharedAbilities: familyAbilities("sword") },
  bow: { masteryId: STANDARD_WEAPON_FAMILIES.bow.masteryId, name: STANDARD_WEAPON_FAMILIES.bow.name, sharedAbilities: familyAbilities("bow") },
  fire_staff: { masteryId: STANDARD_WEAPON_FAMILIES.fire_staff.masteryId, name: STANDARD_WEAPON_FAMILIES.fire_staff.name, sharedAbilities: familyAbilities("fire_staff") },
  gloves: { masteryId: STANDARD_WEAPON_FAMILIES.gloves.masteryId, name: STANDARD_WEAPON_FAMILIES.gloves.name, sharedAbilities: familyAbilities("gloves") },
  dagger: { masteryId: STANDARD_WEAPON_FAMILIES.dagger.masteryId, name: STANDARD_WEAPON_FAMILIES.dagger.name, sharedAbilities: familyAbilities("dagger") },
} as const;
export type WeaponFamilyId = AuthoredWeaponFamilyId;
type WeaponItemContent = AuthoredWeaponItemContent;
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

const STANDARD_WEAPON_PRESENTATION: Readonly<Record<string, WeaponPresentationContent>> = {
  mastery_broadsword: { itemIcon: "item-broadsword-pixel-v1.png", actorManifestId: "hero_broadsword", combatProfileId: "melee" },
  mastery_longbow: { itemIcon: "item-longbow-pixel-v1.png", actorManifestId: "hero_longbow", combatProfileId: "projectile", combatPresentation: { kind: "projectile", projectileId: "arrow", releaseDelayMs: 355 } },
  mastery_badon: { itemIcon: "item-badon-pixel-v1.png", actorManifestId: "hero_bow", combatProfileId: "projectile", combatPresentation: { kind: "projectile", projectileId: "badon_arrow", releaseDelayMs: 355 } },
  mastery_infernal_staff: { itemIcon: "item-fire-staff-pixel-v1.png", actorManifestId: "hero_fire_staff", combatProfileId: "projectile", combatPresentation: { kind: "projectile", projectileId: "fireball", releaseDelayMs: 355 } },
  mastery_spiked_gauntlets: { itemIcon: "item-spiked-gauntlets-pixel-v1.png", actorManifestId: "hero_spiked_gauntlets", combatProfileId: "melee" },
  mastery_dagger_pair: { itemIcon: "item-dagger-pair-pixel-v1.png", actorManifestId: "hero_dagger_pair", combatProfileId: "melee" },
};

const STANDARD_WEAPON_ENTRIES: readonly AuthoredWeaponSpecializationContent[] = STANDARD_WEAPON_CONTENT;

function importStandardSpecialization(entry: AuthoredWeaponSpecializationContent): WeaponSpecializationContent {
  const presentation = STANDARD_WEAPON_PRESENTATION[entry.specializationMasteryId];
  return {
    familyId: entry.familyId,
    specializationMasteryId: entry.specializationMasteryId,
    specializationName: entry.specializationName,
    combatProfile: entry.combatProfile,
    attackSpeed: entry.attackSpeed,
    ...(presentation === undefined ? {} : { presentation }),
    ...(entry.artifactFaction === undefined ? {} : { artifactFaction: entry.artifactFaction }),
    signatureAbility: ABILITIES[entry.signatureAbilityKey],
    craft: entry.craft,
    items: entry.items,
  };
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

const WEAPON_CONTENT: readonly WeaponSpecializationContent[] = [
  ...STANDARD_WEAPON_ENTRIES.map(importStandardSpecialization),
  ...FACTION_ARTIFACT_WEAPON_CONTENT.map(importArtifactSpecialization),
];

const ALL_ARTIFACT_ABILITIES = Object.values(FACTION_ARTIFACT_ABILITIES) as unknown as readonly ClientAbilityDefinition[];
export const CLIENT_ABILITIES: Readonly<Record<string, ClientAbilityDefinition>> = Object.fromEntries(
  [...Object.values(ABILITIES), ...ALL_ARTIFACT_ABILITIES].map((ability) => [ability.id, ability] as const),
);
export const WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(
  WEAPON_CONTENT.flatMap((entry) => entry.items).map((item) => [item.itemId, {
    itemId: item.itemId,
    slot: "weapon",
    handling: item.handling,
    stats: item.stats,
    enchantment: { enabled: item.tier >= 4, maximumLevel: item.tier >= 4 ? 3 : 0 },
  }] as const),
);
interface WeaponItemRoute { readonly specialization: WeaponSpecializationContent; readonly item: WeaponItemContent; }
const CONTENT_BY_ITEM_ID = new Map<string, WeaponItemRoute>(
  WEAPON_CONTENT.flatMap((specialization) => specialization.items.map((item) => [item.itemId, { specialization, item }] as const)),
);
export function resolveWeaponAbilityUnlocks(itemId: string | null | undefined): readonly WeaponAbilityUnlock[] {
  if (itemId == null) return [];
  const specialization = CONTENT_BY_ITEM_ID.get(itemId)?.specialization;
  if (specialization === undefined) return [];
  const [q, w] = WEAPON_FAMILIES[specialization.familyId].sharedAbilities;
  return [
    { unlockMasteryLevel: 1, source: "family", ability: q },
    { unlockMasteryLevel: 10, source: "family", ability: w },
    { unlockMasteryLevel: 30, source: "specialization", ability: specialization.signatureAbility },
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
export function resolveWeaponTier(itemId: string): WeaponItemContent["tier"] | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.item.tier; }
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
