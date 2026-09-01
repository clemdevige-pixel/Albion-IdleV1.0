import type { ProductionTier } from "./production-balance.js";
import type {
  AuthoredWeaponAbilityAutoRule,
  AuthoredWeaponAbilityDefinition,
  AuthoredWeaponAbilityMechanic,
} from "./weapon-ability-content.js";
import type {
  AuthoredWeaponCombatProfile,
  AuthoredWeaponFamilyId,
  AuthoredWeaponHandling,
  AuthoredWeaponItemContent,
} from "./weapon-content.js";

export type ArtifactFaction = "Keeper" | "Morgana" | "Undead" | "Heretic";
export type ArtifactWeaponFamilyId = AuthoredWeaponFamilyId;
export type ArtifactWeaponCombatProfile = Exclude<AuthoredWeaponCombatProfile, "hammer">;

export const FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER: Readonly<Partial<Record<ProductionTier, number>>> = {
  4: 20,
  5: 22,
  6: 24,
  7: 26,
  8: 28,
};

export const FACTION_ARTIFACT_ADVANTAGE: Readonly<Record<ArtifactFaction, ArtifactFaction>> = {
  Keeper: "Morgana",
  Morgana: "Undead",
  Undead: "Heretic",
  Heretic: "Keeper",
};

export type ArtifactAbilityAutoRule = AuthoredWeaponAbilityAutoRule;
export type ArtifactAbilityMechanic = AuthoredWeaponAbilityMechanic;
export type ArtifactClientAbilityDefinition = AuthoredWeaponAbilityDefinition;

type AbilityInput = Omit<ArtifactClientAbilityDefinition, "mechanics" | "bonusDamageRatio" | "autoCast">;
type DamageMechanic = Extract<ArtifactAbilityMechanic, { readonly kind: "damage" }>;

function ability(
  definition: AbilityInput,
  profile: ArtifactClientAbilityDefinition["mechanics"],
): ArtifactClientAbilityDefinition {
  const primary = profile.mechanics.find((mechanic): mechanic is DamageMechanic => mechanic.kind === "damage");
  return {
    ...definition,
    mechanics: profile,
    bonusDamageRatio: primary?.ratio ?? 0,
    ...(profile.autoRule === undefined ? {} : { autoCast: profile.autoRule }),
  };
}

export const FACTION_ARTIFACT_ABILITIES = {
  clarentCrescentSlash: ability({ id: "ability_sword_clarent_crescent_slash", name: "Crescent Slash", description: "Une frappe circulaire infligeant de lourds dégâts physiques.", icon: "⚔️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 2.0 }] }),
  carvingFearlessStrike: ability({ id: "ability_sword_carving_fearless_strike", name: "Fearless Strike", description: "Une frappe pénétrante qui réduit fortement l'armure de la cible.", icon: "⚔️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.65 }, { kind: "status", effectId: "effect_sword_carving_armor_break", effectType: "debuff", duration: 6, statId: "stat_armor", statDelta: -20 }] }),
  galatineSoullessStream: ability({ id: "ability_sword_galatine_soulless_stream", name: "Soulless Stream", description: "Une décharge massive de dégâts physiques sans effet secondaire.", icon: "⚔️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 2.9 }] }),
  claymoreCharge: ability({ id: "ability_sword_claymore_charge", name: "Charge", description: "Une charge brutale qui inflige des dégâts et étourdit brièvement la cible.", icon: "⚔️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.65 }, { kind: "status", effectId: "effect_sword_claymore_stun", effectType: "stun", duration: 1 }] }),

  wailingDemonArrow: ability({ id: "ability_bow_wailing_demon_arrow", name: "Demon Arrow", description: "Une flèche démoniaque infligeant de lourds dégâts physiques.", icon: "🏹", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 2.6 }] }),
  whisperingUndeadArrows: ability({ id: "ability_bow_whispering_undead_arrows", name: "Undead Arrows", description: "Renforce temporairement la cadence et les auto-attaques.", icon: "🏹", category: "active", cooldown: 20, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [
    { kind: "status", target: "self", effectId: "effect_bow_whispering_attack_speed", effectType: "buff", duration: 6, statId: "stat_attack_speed", statDelta: 25, modifierType: "percent" },
    { kind: "auto_attack_bonus_window", effectId: "effect_bow_whispering_bonus_damage", duration: 6, ratio: 0.6, damageType: "magical", scalingDamageType: "physical" },
  ] }),
  warbowMagicArrow: ability({ id: "ability_bow_warbow_magic_arrow", name: "Magic Arrow", description: "Une flèche magique à fort impact et faible temps de recharge.", icon: "🏹", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 2.15, scalingDamageType: "physical" }] }),

  wildfireMagmaSphere: ability({ id: "ability_fire_wildfire_magma_sphere", name: "Magma Sphere", description: "Une sphère de magma qui frappe puis brûle la cible.", icon: "🔥", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 1.45 }, { kind: "dot", effectId: "effect_fire_wildfire_magma", ratio: 0.2, interval: 1, ticks: 4 }] }),
  blazingFlameTornado: ability({ id: "ability_fire_blazing_flame_tornado", name: "Flame Tornado", description: "Une tornade ardente qui frappe la cible à plusieurs reprises.", icon: "🔥", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 1.35, hits: 3 }] }),
  brimstoneMeteor: ability({ id: "ability_fire_brimstone_meteor", name: "Meteor", description: "Un météore infligeant des dégâts magiques massifs.", icon: "☄️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 2.0 }] }),
  greatFirePyroblast: ability({ id: "ability_fire_great_pyroblast", name: "Pyroblast", description: "Une explosion de feu qui inflige des dégâts et réduit la cible au silence.", icon: "🔥", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 3.55 }, { kind: "status", effectId: "effect_fire_great_silence", effectType: "silence", duration: 1.5 }] }),

  ursineHundredFists: ability({ id: "ability_gloves_ursine_hundred_fists", name: "Hundred Striking Fists", description: "Une rafale de frappes conclue par un impact magique.", icon: "🥊", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.3, hits: 6 }, { kind: "bonus_damage", ratio: 2.65, damageType: "magical", scalingDamageType: "physical" }] }),
  ravenstrikeEarthCrusher: ability({ id: "ability_gloves_ravenstrike_earth_crusher", name: "Earth Crusher", description: "Un impact magique massif qui étourdit brièvement la cible.", icon: "🥊", category: "active", cooldown: 16, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 2.1, scalingDamageType: "physical" }, { kind: "status", effectId: "effect_gloves_ravenstrike_stun", effectType: "stun", duration: 1 }] }),
  hellfireInfernalBoulder: ability({ id: "ability_gloves_hellfire_infernal_boulder", name: "Infernal Boulder", description: "Un impact physique suivi d'une brûlure persistante.", icon: "🥊", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.25 }, { kind: "dot", effectId: "effect_gloves_hellfire_burn", ratio: 0.16, interval: 1, ticks: 4 }] }),
  battleBracersFalconSmash: ability({ id: "ability_gloves_battle_bracers_falcon_smash", name: "Falcon Smash", description: "Un assaut brutal concentré sur le burst physique.", icon: "🥊", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 3.9 }] }),

  bloodletterLungingStabs: ability({ id: "ability_dagger_bloodletter_lunging_stabs", name: "Lunging Stabs", description: "Une frappe d'exécution dont la puissance double sous 40% de vie cible.", icon: "🗡️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { autoRule: { kind: "target_health_below", ratio: 0.4 }, mechanics: [{ kind: "damage", ratio: 1.8, bonusHealthBelow: { ratio: 0.4, bonusRatio: 1.3 } }] }),
  demonfangBloodRitual: ability({ id: "ability_dagger_demonfang_blood_ritual", name: "Blood Ritual", description: "Trois frappes magiques rapides alimentées par la puissance physique de l'arme.", icon: "🗡️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 1.15, hits: 3, scalingDamageType: "physical" }] }),
  deathgiversGhostStrike: ability({ id: "ability_dagger_deathgivers_ghost_strike", name: "Ghost Strike", description: "Une frappe magique lourde qui consomme l'ouverture préparée par Rafale de lames.", icon: "🗡️", category: "active", cooldown: 8, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "magical" }, { autoRule: { kind: "target_has_effect", effectId: "effect_dagger_combo_ready" }, mechanics: [{ kind: "damage", ratio: 1.8, scalingDamageType: "physical", bonusEffect: { effectId: "effect_dagger_combo_ready", bonusRatio: 2.5 } }, { kind: "consume_effect", effectId: "effect_dagger_combo_ready" }] }),
  clawsDisembowel: ability({ id: "ability_dagger_claws_disembowel", name: "Disembowel", description: "Une série de coups qui immobilise brièvement puis fait saigner la cible.", icon: "🗡️", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.06, hits: 4 }, { kind: "status", effectId: "effect_dagger_claws_stun", effectType: "stun", duration: 1.25 }, { kind: "dot", effectId: "effect_dagger_claws_bleed", ratio: 0.1, interval: 1, ticks: 3 }] }),
} as const satisfies Readonly<Record<string, ArtifactClientAbilityDefinition>>;

export interface FactionArtifactWeaponSpecializationContent {
  readonly familyId: ArtifactWeaponFamilyId;
  readonly specializationMasteryId: string;
  readonly specializationName: string;
  readonly combatProfile: ArtifactWeaponCombatProfile;
  readonly attackSpeed: number;
  readonly artifactFaction: ArtifactFaction;
  readonly signatureAbility: ArtifactClientAbilityDefinition;
  readonly craft: { readonly kind: "artifact_pending" };
  readonly items: readonly AuthoredWeaponItemContent[];
}

const physicalItems = (
  slug: string,
  handling: AuthoredWeaponHandling,
  values: readonly [number, number, number, number, number],
  sellBase: number,
): readonly AuthoredWeaponItemContent[] => values.map((damage, index) => {
  const tier = (index + 4) as ProductionTier;
  return { itemId: `item_weapon_${slug}_t${tier}`, tier, handling, stats: { stat_physical_damage: damage }, sellPrice: sellBase + index * 500 };
});

const magicalItems = (
  slug: string,
  values: readonly [number, number, number, number, number],
  sellBase: number,
): readonly AuthoredWeaponItemContent[] => values.map((damage, index) => {
  const tier = (index + 4) as ProductionTier;
  return { itemId: `item_weapon_${slug}_t${tier}`, tier, handling: "two_handed", stats: { stat_magical_damage: damage }, sellPrice: sellBase + index * 500 };
});

export const FACTION_ARTIFACT_WEAPON_CONTENT: readonly FactionArtifactWeaponSpecializationContent[] = [
  { familyId: "sword", specializationMasteryId: "mastery_clarent_blade", specializationName: "Clarent Blade", combatProfile: "sword", attackSpeed: 1.25, artifactFaction: "Keeper", signatureAbility: FACTION_ARTIFACT_ABILITIES.clarentCrescentSlash, craft: { kind: "artifact_pending" }, items: physicalItems("sword_clarent", "one_handed", [93, 135, 196, 285, 413], 260) },
  { familyId: "sword", specializationMasteryId: "mastery_carving_sword", specializationName: "Carving Sword", combatProfile: "sword", attackSpeed: 1.15, artifactFaction: "Morgana", signatureAbility: FACTION_ARTIFACT_ABILITIES.carvingFearlessStrike, craft: { kind: "artifact_pending" }, items: physicalItems("sword_carving", "two_handed", [107, 148, 215, 312, 452], 260) },
  { familyId: "sword", specializationMasteryId: "mastery_galatine_pair", specializationName: "Galatine Pair", combatProfile: "sword", attackSpeed: 0.95, artifactFaction: "Undead", signatureAbility: FACTION_ARTIFACT_ABILITIES.galatineSoullessStream, craft: { kind: "artifact_pending" }, items: physicalItems("sword_galatine", "two_handed", [118, 171, 248, 360, 522], 260) },
  { familyId: "sword", specializationMasteryId: "mastery_claymore", specializationName: "Claymore", combatProfile: "sword", attackSpeed: 1.10, artifactFaction: "Heretic", signatureAbility: FACTION_ARTIFACT_ABILITIES.claymoreCharge, craft: { kind: "artifact_pending" }, items: physicalItems("sword_claymore", "two_handed", [102, 148, 215, 312, 452], 260) },
  { familyId: "bow", specializationMasteryId: "mastery_wailing_bow", specializationName: "Wailing Bow", combatProfile: "bow", attackSpeed: 0.95, artifactFaction: "Morgana", signatureAbility: FACTION_ARTIFACT_ABILITIES.wailingDemonArrow, craft: { kind: "artifact_pending" }, items: physicalItems("bow_wailing", "two_handed", [134, 181, 263, 382, 553], 260) },
  { familyId: "bow", specializationMasteryId: "mastery_whispering_bow", specializationName: "Whispering Bow", combatProfile: "bow", attackSpeed: 1.15, artifactFaction: "Undead", signatureAbility: FACTION_ARTIFACT_ABILITIES.whisperingUndeadArrows, craft: { kind: "artifact_pending" }, items: physicalItems("bow_whispering", "two_handed", [108, 156, 226, 327, 475], 260) },
  { familyId: "bow", specializationMasteryId: "mastery_warbow", specializationName: "Warbow", combatProfile: "bow", attackSpeed: 1.15, artifactFaction: "Heretic", signatureAbility: FACTION_ARTIFACT_ABILITIES.warbowMagicArrow, craft: { kind: "artifact_pending" }, items: physicalItems("bow_warbow", "two_handed", [120, 168, 243, 353, 512], 260) },
  { familyId: "fire_staff", specializationMasteryId: "mastery_wildfire_staff", specializationName: "Wildfire Staff", combatProfile: "staff", attackSpeed: 0.95, artifactFaction: "Keeper", signatureAbility: FACTION_ARTIFACT_ABILITIES.wildfireMagmaSphere, craft: { kind: "artifact_pending" }, items: magicalItems("staff_wildfire", [124, 180, 260, 378, 548], 280) },
  { familyId: "fire_staff", specializationMasteryId: "mastery_blazing_staff", specializationName: "Blazing Staff", combatProfile: "staff", attackSpeed: 1.00, artifactFaction: "Morgana", signatureAbility: FACTION_ARTIFACT_ABILITIES.blazingFlameTornado, craft: { kind: "artifact_pending" }, items: magicalItems("staff_blazing", [120, 174, 252, 365, 529], 280) },
  { familyId: "fire_staff", specializationMasteryId: "mastery_brimstone_staff", specializationName: "Brimstone Staff", combatProfile: "staff", attackSpeed: 0.80, artifactFaction: "Undead", signatureAbility: FACTION_ARTIFACT_ABILITIES.brimstoneMeteor, craft: { kind: "artifact_pending" }, items: magicalItems("staff_brimstone", [140, 203, 294, 426, 618], 280) },
  { familyId: "fire_staff", specializationMasteryId: "mastery_great_fire_staff", specializationName: "Great Fire Staff", combatProfile: "staff", attackSpeed: 0.95, artifactFaction: "Heretic", signatureAbility: FACTION_ARTIFACT_ABILITIES.greatFirePyroblast, craft: { kind: "artifact_pending" }, items: magicalItems("staff_great_fire", [134, 179, 260, 377, 546], 280) },
  { familyId: "gloves", specializationMasteryId: "mastery_ursine_maulers", specializationName: "Ursine Maulers", combatProfile: "gloves", attackSpeed: 1.30, artifactFaction: "Keeper", signatureAbility: FACTION_ARTIFACT_ABILITIES.ursineHundredFists, craft: { kind: "artifact_pending" }, items: physicalItems("gloves_ursine", "two_handed", [98, 142, 207, 300, 435], 270) },
  { familyId: "gloves", specializationMasteryId: "mastery_ravenstrike_cestus", specializationName: "Ravenstrike Cestus", combatProfile: "gloves", attackSpeed: 1.00, artifactFaction: "Morgana", signatureAbility: FACTION_ARTIFACT_ABILITIES.ravenstrikeEarthCrusher, craft: { kind: "artifact_pending" }, items: physicalItems("gloves_ravenstrike", "two_handed", [106, 154, 223, 323, 468], 270) },
  { familyId: "gloves", specializationMasteryId: "mastery_hellfire_hands", specializationName: "Hellfire Hands", combatProfile: "gloves", attackSpeed: 1.15, artifactFaction: "Undead", signatureAbility: FACTION_ARTIFACT_ABILITIES.hellfireInfernalBoulder, craft: { kind: "artifact_pending" }, items: physicalItems("gloves_hellfire", "two_handed", [103, 149, 216, 314, 456], 270) },
  { familyId: "gloves", specializationMasteryId: "mastery_battle_bracers", specializationName: "Battle Bracers", combatProfile: "gloves", attackSpeed: 1.30, artifactFaction: "Heretic", signatureAbility: FACTION_ARTIFACT_ABILITIES.battleBracersFalconSmash, craft: { kind: "artifact_pending" }, items: physicalItems("gloves_battle_bracers", "two_handed", [100, 137, 199, 289, 418], 270) },
  { familyId: "dagger", specializationMasteryId: "mastery_bloodletter", specializationName: "Bloodletter", combatProfile: "dagger", attackSpeed: 1.45, artifactFaction: "Keeper", signatureAbility: FACTION_ARTIFACT_ABILITIES.bloodletterLungingStabs, craft: { kind: "artifact_pending" }, items: physicalItems("dagger_bloodletter", "one_handed", [81, 118, 171, 247, 359], 270) },
  { familyId: "dagger", specializationMasteryId: "mastery_demonfang", specializationName: "Demonfang", combatProfile: "dagger", attackSpeed: 1.25, artifactFaction: "Morgana", signatureAbility: FACTION_ARTIFACT_ABILITIES.demonfangBloodRitual, craft: { kind: "artifact_pending" }, items: physicalItems("dagger_demonfang", "one_handed", [90, 130, 188, 273, 396], 270) },
  { familyId: "dagger", specializationMasteryId: "mastery_deathgivers", specializationName: "Deathgivers", combatProfile: "dagger", attackSpeed: 1.35, artifactFaction: "Undead", signatureAbility: FACTION_ARTIFACT_ABILITIES.deathgiversGhostStrike, craft: { kind: "artifact_pending" }, items: physicalItems("dagger_deathgivers", "two_handed", [84, 122, 177, 257, 372], 270) },
  { familyId: "dagger", specializationMasteryId: "mastery_claws", specializationName: "Claws", combatProfile: "dagger", attackSpeed: 1.15, artifactFaction: "Heretic", signatureAbility: FACTION_ARTIFACT_ABILITIES.clawsDisembowel, craft: { kind: "artifact_pending" }, items: physicalItems("dagger_claws", "two_handed", [92, 134, 194, 281, 408], 270) },
];

export function isArtifactFaction(value: string | undefined): value is ArtifactFaction {
  return value === "Keeper" || value === "Morgana" || value === "Undead" || value === "Heretic";
}

export function getArtifactAdvantageTarget(faction: ArtifactFaction): ArtifactFaction {
  return FACTION_ARTIFACT_ADVANTAGE[faction];
}
