import {
  asMasteryId,
  WEAPON_MASTERY_XP,
  type AbilityDefinitionLike,
  type DamageType,
  type EquipmentInfoLike,
} from "@game/gameplay";

export type WeaponCombatProfile = "dagger" | "sword" | "bow" | "staff" | "hammer" | "gloves";
export const WEAPON_ATTACK_SPEED_BY_PROFILE: Readonly<Record<WeaponCombatProfile, number>> = { dagger: 1.6, sword: 1.2, bow: 1, staff: 0.9, hammer: 0.75, gloves: 1.4 };

export interface ClientAbilityDefinition extends AbilityDefinitionLike { readonly name: string; readonly description: string; readonly icon: string; readonly damageType: DamageType; readonly bonusDamageRatio: number; }
export interface WeaponCraftMaterial { readonly kind: "wood" | "metal" | "leather" | "cloth"; readonly quantity: number; }
export type WeaponCraftRule = { readonly kind: "standard"; readonly materials: readonly WeaponCraftMaterial[] } | { readonly kind: "artifact_pending" };

export const WEAPON_FAMILIES = {
  sword: { masteryId: "mastery_sword", name: "Épées" },
  bow: { masteryId: "mastery_bow", name: "Arcs" },
  fire_staff: { masteryId: "mastery_fire_staff", name: "Bâtons de feu" },
  gloves: { masteryId: "mastery_gloves", name: "Gants" },
  dagger: { masteryId: "mastery_dagger", name: "Dagues" },
} as const;
export type WeaponFamilyId = keyof typeof WEAPON_FAMILIES;

interface WeaponItemContent { readonly itemId: string; readonly tier: 3 | 4; readonly handling: EquipmentInfoLike["handling"]; readonly stats: EquipmentInfoLike["stats"]; readonly sellPrice: number; }
interface WeaponSpecializationContent { readonly familyId: WeaponFamilyId; readonly specializationMasteryId: string; readonly specializationName: string; readonly combatProfile: WeaponCombatProfile; readonly ability: ClientAbilityDefinition; readonly craft: WeaponCraftRule; readonly items: readonly WeaponItemContent[]; }

const WEAPON_CONTENT: readonly WeaponSpecializationContent[] = [
  {
    familyId: "sword", specializationMasteryId: "mastery_broadsword", specializationName: "Épée large", combatProfile: "sword",
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] },
    ability: { id: "ability_sword_heroic_strike", name: "Frappe héroïque", description: "Une frappe lourde infligeant 175 % des dégâts physiques.", icon: "⚔️", category: "active", cooldown: 8, castTime: 0, resourceCost: { energy: 12 }, interruptible: false, targetRule: "current_target", damageType: "physical", bonusDamageRatio: 0.75 },
    items: [{ itemId: "item_weapon_sword_t3_broadsword", tier: 3, handling: "one_handed", stats: { stat_physical_damage: 45 }, sellPrice: 70 }, { itemId: "item_weapon_sword_t4_broadsword", tier: 4, handling: "one_handed", stats: { stat_physical_damage: 75 }, sellPrice: 200 }],
  },
  {
    familyId: "bow", specializationMasteryId: "mastery_longbow", specializationName: "Arc long", combatProfile: "bow",
    craft: { kind: "standard", materials: [{ kind: "wood", quantity: 6 }, { kind: "leather", quantity: 2 }, { kind: "cloth", quantity: 2 }] },
    ability: { id: "ability_bow_aimed_shot", name: "Tir ajusté", description: "Un tir précis infligeant 160 % des dégâts physiques.", icon: "🏹", category: "active", cooldown: 5, castTime: 0, resourceCost: { energy: 8 }, interruptible: true, targetRule: "current_target", damageType: "physical", bonusDamageRatio: 0.6 },
    items: [{ itemId: "item_weapon_bow_t3_longbow", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 50 }, sellPrice: 70 }, { itemId: "item_weapon_bow_t4_longbow", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 85 }, sellPrice: 200 }],
  },
  {
    familyId: "bow", specializationMasteryId: "mastery_badon", specializationName: "Badon", combatProfile: "bow", craft: { kind: "artifact_pending" },
    ability: { id: "ability_bow_aimed_shot", name: "Tir ajusté", description: "Un tir précis infligeant 160 % des dégâts physiques.", icon: "🏹", category: "active", cooldown: 5, castTime: 0, resourceCost: { energy: 8 }, interruptible: true, targetRule: "current_target", damageType: "physical", bonusDamageRatio: 0.6 },
    items: [{ itemId: "item_weapon_bow_t4_badon", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 87 }, sellPrice: 260 }],
  },
  {
    familyId: "fire_staff", specializationMasteryId: "mastery_t4_fire_staff", specializationName: "Bâton de feu", combatProfile: "staff",
    craft: { kind: "standard", materials: [{ kind: "wood", quantity: 4 }, { kind: "metal", quantity: 4 }, { kind: "cloth", quantity: 2 }] },
    ability: { id: "ability_fire_fireball", name: "Boule de feu", description: "Un projectile ardent infligeant 170 % des dégâts magiques.", icon: "🔥", category: "active", cooldown: 5, castTime: 0, resourceCost: { energy: 15 }, interruptible: true, targetRule: "current_target", damageType: "magical", bonusDamageRatio: 0.7 },
    items: [{ itemId: "item_weapon_staff_t3_fire", tier: 3, handling: "two_handed", stats: { stat_magical_damage: 48 }, sellPrice: 80 }, { itemId: "item_weapon_staff_t4_fire", tier: 4, handling: "two_handed", stats: { stat_magical_damage: 90 }, sellPrice: 220 }],
  },
  {
    familyId: "gloves", specializationMasteryId: "mastery_spiked_gauntlets", specializationName: "Gantelets à pointes", combatProfile: "gloves",
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 5 }, { kind: "leather", quantity: 3 }] },
    ability: { id: "ability_gloves_shockwave", name: "Onde percutante", description: "Un double impact libère une onde de choc infligeant 180 % des dégâts physiques.", icon: "🥊", category: "active", cooldown: 6, castTime: 0, resourceCost: { energy: 10 }, interruptible: false, targetRule: "current_target", damageType: "physical", bonusDamageRatio: 0.8 },
    items: [{ itemId: "item_weapon_gloves_t3_spiked_gauntlets", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 38 }, sellPrice: 75 }, { itemId: "item_weapon_gloves_t4_spiked_gauntlets", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 66 }, sellPrice: 210 }],
  },
  {
    familyId: "dagger", specializationMasteryId: "mastery_dagger_pair", specializationName: "Paire de dagues", combatProfile: "dagger",
    craft: { kind: "standard", materials: [{ kind: "metal", quantity: 6 }, { kind: "leather", quantity: 2 }] },
    ability: { id: "ability_dagger_double_slash", name: "Double entaille", description: "Deux lames frappent en succession rapide pour infliger 150 % des dégâts physiques.", icon: "🗡️", category: "active", cooldown: 4, castTime: 0, resourceCost: { energy: 8 }, interruptible: false, targetRule: "current_target", damageType: "physical", bonusDamageRatio: 0.5 },
    items: [{ itemId: "item_weapon_dagger_t3_pair", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 34 }, sellPrice: 75 }, { itemId: "item_weapon_dagger_t4_pair", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 58 }, sellPrice: 210 }],
  },
];

export const CLIENT_ABILITIES: Readonly<Record<string, ClientAbilityDefinition>> = Object.fromEntries(WEAPON_CONTENT.map((entry) => [entry.ability.id, entry.ability]));
export const WEAPON_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(WEAPON_CONTENT.flatMap((entry) => entry.items).map((item) => [item.itemId, { itemId: item.itemId, slot: "weapon", handling: item.handling, stats: item.stats }]));
interface WeaponItemRoute { readonly specialization: WeaponSpecializationContent; readonly item: WeaponItemContent; }
const CONTENT_BY_ITEM_ID = new Map<string, WeaponItemRoute>(WEAPON_CONTENT.flatMap((specialization) => specialization.items.map((item) => [item.itemId, { specialization, item }] as const)));

export function resolvePrimaryAbilityId(itemId: string | null | undefined): string | undefined { if (itemId == null) return undefined; return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.ability.id; }
export interface WeaponMasteryRoute { readonly familyId: ReturnType<typeof asMasteryId>; readonly weaponId: ReturnType<typeof asMasteryId>; }
export function resolveWeaponMastery(itemId: string): WeaponMasteryRoute | undefined { const entry = CONTENT_BY_ITEM_ID.get(itemId)?.specialization; if (entry === undefined) return undefined; const family = WEAPON_FAMILIES[entry.familyId]; return { familyId: asMasteryId(family.masteryId), weaponId: asMasteryId(entry.specializationMasteryId) }; }
export function resolveWeaponFamilyId(itemId: string): WeaponFamilyId | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.familyId; }
export function resolveWeaponTier(itemId: string): 3 | 4 | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.item.tier; }
export function resolveWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.combatProfile; }
export function resolveWeaponAttackSpeed(itemId: string): number | undefined { const profile = resolveWeaponCombatProfile(itemId); return profile === undefined ? undefined : WEAPON_ATTACK_SPEED_BY_PROFILE[profile]; }
export function resolveWeaponCraftRule(itemId: string): WeaponCraftRule | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.craft; }
export function resolvePreviousWeaponTierItemId(itemId: string): string | undefined { const route = CONTENT_BY_ITEM_ID.get(itemId); if (route === undefined || route.item.tier < 4 || route.specialization.craft.kind !== "standard") return undefined; return route.specialization.items.find((item) => item.tier === route.item.tier - 1)?.itemId; }
export function getWeaponSpecializationName(itemId: string): string | undefined { return CONTENT_BY_ITEM_ID.get(itemId)?.specialization.specializationName; }
export function getWeaponFamilyDisplayName(familyId: string): string | undefined { return WEAPON_FAMILIES[familyId as WeaponFamilyId]?.name; }

export interface WeaponMasteryFamilyDefinition { readonly familyId: WeaponFamilyId; readonly masteryId: string; readonly specializationMasteryIds: readonly string[]; }
export function getWeaponMasteryFamilyDefinitions(): readonly WeaponMasteryFamilyDefinition[] {
  return (Object.keys(WEAPON_FAMILIES) as WeaponFamilyId[]).map((familyId) => ({
    familyId,
    masteryId: WEAPON_FAMILIES[familyId].masteryId,
    specializationMasteryIds: WEAPON_CONTENT.filter((entry) => entry.familyId === familyId).map((entry) => entry.specializationMasteryId),
  }));
}

const masteryNames = new Map<string, string>();
const familyMasteryIds = new Set<string>();
const specializationMasteryIds = new Set<string>();
for (const family of Object.values(WEAPON_FAMILIES)) { masteryNames.set(family.masteryId, family.name); familyMasteryIds.add(family.masteryId); }
for (const entry of WEAPON_CONTENT) { masteryNames.set(entry.specializationMasteryId, entry.specializationName); specializationMasteryIds.add(entry.specializationMasteryId); }
export function getWeaponMasteryDisplayName(masteryId: string): string | undefined { return masteryNames.get(masteryId); }
export const WEAPON_MASTERY_DEFINITIONS = [...familyMasteryIds, ...specializationMasteryIds].map((id) => ({ id, category: specializationMasteryIds.has(id) ? "weapon_specialization" : "weapon", maxLevel: 100, experiencePerLevel: WEAPON_MASTERY_XP }));
export const WEAPON_VENDOR_OFFERS = WEAPON_CONTENT.flatMap((entry) => entry.items.map((item) => ({ itemId: item.itemId, buyPrice: null, sellPrice: item.sellPrice, maxPerTransaction: null, enabled: true })));
