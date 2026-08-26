import {
  asMasteryId,
  WEAPON_MASTERY_XP,
  type AbilityDefinitionLike,
  type DamageType,
  type EquipmentInfoLike,
} from "@game/gameplay";
import type { ProductionTier } from "./productionFamilyCatalog.js";
import {
  FACTION_ARTIFACT_ABILITIES,
  FACTION_ARTIFACT_ADVANTAGE,
  FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT,
  FACTION_ARTIFACT_WEAPON_CONTENT,
  type ArtifactFaction,
  type FactionArtifactWeaponSpecializationContent,
} from "./factionArtifactWeaponContent.js";

export type WeaponCombatProfile = "dagger" | "sword" | "bow" | "staff" | "hammer" | "gloves";
export type AbilityAutoRule =
  | { readonly kind: "always" }
  | { readonly kind: "target_health_below"; readonly ratio: number }
  | { readonly kind: "target_has_effect"; readonly effectId: string };
export type AbilityMechanic =
  | {
      readonly kind: "damage";
      readonly ratio: number;
      readonly hits?: number;
      readonly damageType?: DamageType;
      readonly scalingDamageType?: DamageType;
      readonly bonusHealthBelow?: { readonly ratio: number; readonly bonusRatio: number };
      readonly bonusEffect?: { readonly effectId: string; readonly bonusRatio: number };
    }
  | {
      readonly kind: "bonus_damage";
      readonly ratio: number;
      readonly damageType?: DamageType;
      readonly scalingDamageType?: DamageType;
    }
  | { readonly kind: "heal_from_damage"; readonly ratio: number; readonly maxHealthRatio?: number }
  | {
      readonly kind: "status";
      readonly target?: "enemy" | "self";
      readonly effectId: string;
      readonly effectType: "buff" | "debuff" | "stun" | "silence";
      readonly duration: number;
      readonly statId?: "stat_armor" | "stat_magic_resistance" | "stat_auto_attack_damage_taken_bonus" | "stat_attack_speed" | "stat_damage_taken_bonus";
      readonly statDelta?: number;
      readonly modifierType?: "flat" | "percent" | "multiplier";
    }
  | {
      readonly kind: "dot";
      readonly effectId: string;
      readonly ratio: number;
      readonly interval: number;
      readonly ticks: number;
      readonly damageType?: DamageType;
      readonly scalingDamageType?: DamageType;
    }
  | {
      readonly kind: "auto_attack_bonus_window";
      readonly effectId: string;
      readonly duration: number;
      readonly ratio: number;
      readonly damageType: DamageType;
      readonly scalingDamageType: DamageType;
    };
export interface AbilityMechanicsProfile { readonly autoRule?: AbilityAutoRule; readonly mechanics: readonly AbilityMechanic[]; }
export type AbilityAutoCastRule = AbilityAutoRule;
export interface ClientAbilityDefinition extends AbilityDefinitionLike {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly damageType: DamageType;
  readonly mechanics: AbilityMechanicsProfile;
  readonly bonusDamageRatio: number;
  readonly autoCast?: AbilityAutoCastRule;
}
export interface WeaponAbilityUnlock { readonly unlockMasteryLevel: number; readonly source: "family" | "specialization"; readonly ability: ClientAbilityDefinition; }
export interface WeaponCraftMaterial { readonly kind: "wood" | "metal" | "leather" | "cloth"; readonly quantity: number; }
export type WeaponCraftRule = { readonly kind: "standard"; readonly materials: readonly WeaponCraftMaterial[] } | { readonly kind: "artifact_pending" };
type AuthoredAbilityDefinition = Omit<ClientAbilityDefinition, "mechanics" | "bonusDamageRatio" | "autoCast">;
type DamageMechanic = Extract<AbilityMechanic, { readonly kind: "damage" }>;
function defineWeaponAbility(definition: AuthoredAbilityDefinition, mechanics: AbilityMechanicsProfile): ClientAbilityDefinition {
  const primaryDamage = mechanics.mechanics.find((mechanic): mechanic is DamageMechanic => mechanic.kind === "damage");
  return {
    ...definition,
    mechanics,
    bonusDamageRatio: primaryDamage?.ratio ?? 0,
    ...(mechanics.autoRule === undefined ? {} : { autoCast: mechanics.autoRule }),
  };
}

const ABILITIES = {
  swordHeroicStrike: defineWeaponAbility({ id: "ability_sword_heroic_strike", name: "Frappe héroïque", description: "Une frappe lourde infligeant des dégâts physiques.", icon: "⚔️", category: "active", cooldown: 6, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.9 }] }),
  swordGuardBreaker: defineWeaponAbility({ id: "ability_sword_guard_breaker", name: "Brise-garde", description: "Inflige des dégâts physiques et réduit temporairement l'armure de la cible.", icon: "🛡️", category: "active", cooldown: 9, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1 }, { kind: "status", effectId: "effect_sword_armor_break", effectType: "debuff", duration: 5, statId: "stat_armor", statDelta: -12 }] }),
  broadswordExecution: defineWeaponAbility({ id: "ability_sword_execution", name: "Exécution", description: "Une frappe de finition renforcée contre les cibles affaiblies.", icon: "💥", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { autoRule: { kind: "target_health_below", ratio: 0.5 }, mechanics: [{ kind: "damage", ratio: 1.55, bonusHealthBelow: { ratio: 0.5, bonusRatio: 0.75 } }] }),
  bowAimedShot: defineWeaponAbility({ id: "ability_bow_aimed_shot", name: "Tir ajusté", description: "Un tir précis infligeant des dégâts physiques.", icon: "🏹", category: "active", cooldown: 5, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.534 }] }),
  bowPiercingArrow: defineWeaponAbility({ id: "ability_bow_piercing_arrow", name: "Flèche perforante", description: "Un projectile puissant inflige des dégâts physiques et réduit temporairement l'armure de la cible.", icon: "➶", category: "active", cooldown: 10, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.712 }, { kind: "status", effectId: "effect_bow_pierce", effectType: "debuff", duration: 4, statId: "stat_armor", statDelta: -8 }] }),
  longbowDeadeye: defineWeaponAbility({ id: "ability_bow_deadeye", name: "Œil mortel", description: "Un tir ultime d'une précision absolue infligeant de lourds dégâts physiques.", icon: "🎯", category: "active", cooldown: 25, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.95 }] }),
  badonRagingStorm: defineWeaponAbility({ id: "ability_bow_badon_raging_storm", name: "Tempête déchaînée", description: "Badon libère une attaque dévastatrice qui étourdit brièvement la cible.", icon: "🌩️", category: "active", cooldown: 28, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.35 }, { kind: "status", effectId: "effect_bow_badon_stun", effectType: "stun", duration: 1.25 }] }),
  fireFireball: defineWeaponAbility({ id: "ability_fire_fireball", name: "Boule de feu", description: "Un projectile ardent inflige des dégâts magiques et embrase la cible.", icon: "🔥", category: "active", cooldown: 5, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 0.428 }, { kind: "dot", effectId: "effect_fire_burn", ratio: 0.096, interval: 1, ticks: 3 }] }),
  fireInfernalBurst: defineWeaponAbility({ id: "ability_fire_infernal_burst", name: "Explosion infernale", description: "Une déflagration concentrée renforcée contre une cible embrasée.", icon: "☄️", category: "active", cooldown: 10, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { autoRule: { kind: "target_has_effect", effectId: "effect_fire_burn" }, mechanics: [{ kind: "damage", ratio: 0.64, bonusEffect: { effectId: "effect_fire_burn", bonusRatio: 0.28 } }] }),
  infernalCataclysm: defineWeaponAbility({ id: "ability_fire_cataclysm", name: "Cataclysme", description: "Le bâton libère une attaque magique massive qui consume la cible dans le temps.", icon: "🌋", category: "active", cooldown: 30, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 1.42 }, { kind: "dot", effectId: "effect_fire_cataclysm", ratio: 0.18, interval: 1, ticks: 5 }] }),
  glovesShockwave: defineWeaponAbility({ id: "ability_gloves_shockwave", name: "Onde percutante", description: "Une onde de choc infligeant des dégâts physiques.", icon: "🥊", category: "active", cooldown: 6, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.18 }] }),
  glovesBreakingCombo: defineWeaponAbility({ id: "ability_gloves_breaking_combo", name: "Combo fracassant", description: "Une combinaison brutale de plusieurs impacts physiques.", icon: "👊", category: "active", cooldown: 9, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.07, hits: 3 }] }),
  spikedSeismicImpact: defineWeaponAbility({ id: "ability_gloves_seismic_impact", name: "Impact sismique", description: "Un impact signature infligeant de lourds dégâts physiques et étourdissant la cible.", icon: "💢", category: "active", cooldown: 20, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 3.2 }, { kind: "status", effectId: "effect_gloves_stun", effectType: "stun", duration: 1.5 }] }),
  daggerDoubleSlash: defineWeaponAbility({ id: "ability_dagger_double_slash", name: "Double entaille", description: "Les deux lames frappent rapidement et rendent 12% des dégâts réellement infligés sous forme de vie, jusqu'à 1,5% des PV max par utilisation.", icon: "🗡️", category: "active", cooldown: 4, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.595, hits: 2 }, { kind: "heal_from_damage", ratio: 0.12, maxHealthRatio: 0.015 }] }),
  daggerFlurry: defineWeaponAbility({ id: "ability_dagger_flurry", name: "Rafale de lames", description: "Une rafale de coups ouvre la garde : les auto-attaques infligent 10% de dégâts supplémentaires pendant 4 s.", icon: "⚔", category: "active", cooldown: 8, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.782, hits: 4 }, { kind: "status", effectId: "effect_dagger_opening", effectType: "debuff", duration: 4, statId: "stat_auto_attack_damage_taken_bonus", statDelta: 10 }] }),
  daggerPairCrossAssault: defineWeaponAbility({ id: "ability_dagger_pair_cross_assault", name: "Assaut croisé", description: "Deux frappes croisées renforcées lorsque Rafale de lames a ouvert la garde.", icon: "🗡️", category: "active", cooldown: 16, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { autoRule: { kind: "target_has_effect", effectId: "effect_dagger_opening" }, mechanics: [{ kind: "damage", ratio: 1.85, hits: 2, bonusEffect: { effectId: "effect_dagger_opening", bonusRatio: 0.95 } }] }),
} as const satisfies Readonly<Record<string, ClientAbilityDefinition>>;

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
  { familyId: "gloves", specializationMasteryId: "mastery_spiked_gauntlets", specializationName: "Gantelets à pointes", combatProfile: "gloves", attackSpeed: 1.204, presentation: { itemIcon: "item-spiked-gauntlets-pixel-v1.png", actorManifestId: "hero_spiked_gauntlets", combatProfileId: "melee" }, signatureAbility: ABILITIES.spikedSeismicImpact, craft: { kind: "standard", materials: [{ kind: "metal", quantity: 5 }, { kind: "leather", quantity: 3 }] }, items: [{ itemId: "item_weapon_gloves_t3_spiked_gauntlets", tier: 3, handling: "two_handed", stats: { stat_physical_damage: 53.2 }, sellPrice: 75 }, { itemId: "item_weapon_gloves_t4_spiked_gauntlets", tier: 4, handling: "two_handed", stats: { stat_physical_damage: 92.4 }, sellPrice: 210 }, { itemId: "item_weapon_gloves_t5_spiked_gauntlets", tier: 5, handling: "two_handed", stats: { stat_physical_damage: 134.4 }, sellPrice: 520 }, { itemId: "item_weapon_gloves_t6_spiked_gauntlets", tier: 6, handling: "two_handed", stats: { stat_physical_damage: 194.9 }, sellPrice: 920 }, { itemId: "item_weapon_gloves_t7_spiked_gauntlets", tier: 7, handling: "two_handed", stats: { stat_physical_damage: 282.6 }, sellPrice: 1475 }, { itemId: "item_weapon_gloves_t8_spiked_gauntlets", tier: 8, handling: "two_handed", stats: { stat_physical_damage: 409.8 }, sellPrice: 2175 }] },
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
  const artifactFaction = resolveWeaponArtifactFaction(itemId);
  if (artifactFaction === undefined) return 0;
  return FACTION_ARTIFACT_ADVANTAGE[artifactFaction] === dungeonFaction ? FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT : 0;
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