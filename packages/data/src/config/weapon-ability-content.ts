export type AuthoredWeaponDamageType = "physical" | "magical" | "true";

export type AuthoredWeaponAbilityAutoRule =
  | { readonly kind: "always" }
  | { readonly kind: "target_health_below"; readonly ratio: number }
  | { readonly kind: "target_has_effect"; readonly effectId: string };

export type AuthoredWeaponAbilityMechanic =
  | {
      readonly kind: "damage";
      readonly ratio: number;
      readonly hits?: number;
      readonly damageType?: AuthoredWeaponDamageType;
      readonly scalingDamageType?: AuthoredWeaponDamageType;
      readonly bonusHealthBelow?: { readonly ratio: number; readonly bonusRatio: number };
      readonly bonusEffect?: { readonly effectId: string; readonly bonusRatio: number };
    }
  | {
      readonly kind: "bonus_damage";
      readonly ratio: number;
      readonly damageType?: AuthoredWeaponDamageType;
      readonly scalingDamageType?: AuthoredWeaponDamageType;
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
      readonly kind: "consume_effect";
      readonly target?: "enemy" | "self";
      readonly effectId: string;
    }
  | {
      readonly kind: "dot";
      readonly effectId: string;
      readonly ratio: number;
      readonly interval: number;
      readonly ticks: number;
      readonly damageType?: AuthoredWeaponDamageType;
      readonly scalingDamageType?: AuthoredWeaponDamageType;
    }
  | {
      readonly kind: "auto_attack_bonus_window";
      readonly effectId: string;
      readonly duration: number;
      readonly ratio: number;
      readonly damageType: AuthoredWeaponDamageType;
      readonly scalingDamageType: AuthoredWeaponDamageType;
    };

export interface AuthoredWeaponAbilityMechanicsProfile {
  readonly autoRule?: AuthoredWeaponAbilityAutoRule;
  readonly mechanics: readonly AuthoredWeaponAbilityMechanic[];
}

export interface AuthoredWeaponAbilityDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly category: "active";
  readonly cooldown: number;
  readonly castTime: number;
  readonly resourceCost: Readonly<Record<string, number>>;
  readonly interruptible: boolean;
  readonly targetRule: "current_target";
  readonly damageType: AuthoredWeaponDamageType;
  readonly mechanics: AuthoredWeaponAbilityMechanicsProfile;
  readonly bonusDamageRatio: number;
  readonly autoCast?: AuthoredWeaponAbilityAutoRule;
}

type AbilityInput = Omit<AuthoredWeaponAbilityDefinition, "mechanics" | "bonusDamageRatio" | "autoCast">;
type DamageMechanic = Extract<AuthoredWeaponAbilityMechanic, { readonly kind: "damage" }>;

function ability(definition: AbilityInput, mechanics: AuthoredWeaponAbilityMechanicsProfile): AuthoredWeaponAbilityDefinition {
  const primaryDamage = mechanics.mechanics.find((mechanic): mechanic is DamageMechanic => mechanic.kind === "damage");
  return {
    ...definition,
    mechanics,
    bonusDamageRatio: primaryDamage?.ratio ?? 0,
    ...(mechanics.autoRule === undefined ? {} : { autoCast: mechanics.autoRule }),
  };
}

/** Canonical authored standard weapon ability balance. Presentation/runtime consumers adapt this data structurally. */
export const STANDARD_WEAPON_ABILITIES = {
  swordHeroicStrike: ability({ id: "ability_sword_heroic_strike", name: "Frappe héroïque", description: "Une frappe lourde infligeant des dégâts physiques.", icon: "⚔️", category: "active", cooldown: 6, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.9 }] }),
  swordGuardBreaker: ability({ id: "ability_sword_guard_breaker", name: "Brise-garde", description: "Inflige des dégâts physiques et réduit temporairement l'armure de la cible.", icon: "🛡️", category: "active", cooldown: 9, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1 }, { kind: "status", effectId: "effect_sword_armor_break", effectType: "debuff", duration: 5, statId: "stat_armor", statDelta: -12 }] }),
  broadswordExecution: ability({ id: "ability_sword_execution", name: "Exécution", description: "Une frappe de finition renforcée contre les cibles affaiblies.", icon: "💥", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { autoRule: { kind: "target_health_below", ratio: 0.5 }, mechanics: [{ kind: "damage", ratio: 1.55, bonusHealthBelow: { ratio: 0.5, bonusRatio: 0.75 } }] }),
  bowAimedShot: ability({ id: "ability_bow_aimed_shot", name: "Tir ajusté", description: "Un tir précis infligeant des dégâts physiques.", icon: "🏹", category: "active", cooldown: 5, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.534 }] }),
  bowPiercingArrow: ability({ id: "ability_bow_piercing_arrow", name: "Flèche perforante", description: "Un projectile puissant inflige des dégâts physiques et réduit temporairement l'armure de la cible.", icon: "➶", category: "active", cooldown: 10, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.712 }, { kind: "status", effectId: "effect_bow_pierce", effectType: "debuff", duration: 4, statId: "stat_armor", statDelta: -8 }] }),
  longbowDeadeye: ability({ id: "ability_bow_deadeye", name: "Œil mortel", description: "Un tir ultime d'une précision absolue infligeant de lourds dégâts physiques.", icon: "🎯", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.48 }] }),
  badonRagingStorm: ability({ id: "ability_bow_badon_raging_storm", name: "Tempête déchaînée", description: "Badon libère une attaque dévastatrice qui étourdit brièvement la cible.", icon: "🌩️", category: "active", cooldown: 16, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.05 }, { kind: "status", effectId: "effect_bow_badon_stun", effectType: "stun", duration: 1.25 }] }),
  fireFireball: ability({ id: "ability_fire_fireball", name: "Boule de feu", description: "Un projectile ardent infligeant des dégâts magiques et embrase la cible.", icon: "🔥", category: "active", cooldown: 5, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 0.428 }, { kind: "dot", effectId: "effect_fire_burn", ratio: 0.096, interval: 1, ticks: 3 }] }),
  fireInfernalBurst: ability({ id: "ability_fire_infernal_burst", name: "Explosion infernale", description: "Une déflagration concentrée renforcée contre une cible embrasée.", icon: "☄️", category: "active", cooldown: 10, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { autoRule: { kind: "target_has_effect", effectId: "effect_fire_burn" }, mechanics: [{ kind: "damage", ratio: 0.64, bonusEffect: { effectId: "effect_fire_burn", bonusRatio: 0.28 } }] }),
  infernalCataclysm: ability({ id: "ability_fire_cataclysm", name: "Cataclysme", description: "Le bâton libère une attaque magique massive qui consume la cible dans le temps.", icon: "🌋", category: "active", cooldown: 14, castTime: 0, resourceCost: {}, interruptible: true, targetRule: "current_target", damageType: "magical" }, { mechanics: [{ kind: "damage", ratio: 1.42 }, { kind: "dot", effectId: "effect_fire_cataclysm", ratio: 0.18, interval: 1, ticks: 5 }] }),
  glovesShockwave: ability({ id: "ability_gloves_shockwave", name: "Onde percutante", description: "Une onde de choc infligeant des dégâts physiques.", icon: "🥊", category: "active", cooldown: 6, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.18 }] }),
  glovesBreakingCombo: ability({ id: "ability_gloves_breaking_combo", name: "Combo fracassant", description: "Une combinaison brutale de plusieurs impacts physiques.", icon: "👊", category: "active", cooldown: 9, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.07, hits: 3 }] }),
  spikedSeismicImpact: ability({ id: "ability_gloves_seismic_impact", name: "Impact sismique", description: "Un impact signature infligeant de lourds dégâts physiques et étourdissant la cible.", icon: "💢", category: "active", cooldown: 16, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 2.07 }, { kind: "status", effectId: "effect_gloves_stun", effectType: "stun", duration: 1.5 }] }),
  daggerDoubleSlash: ability({ id: "ability_dagger_double_slash", name: "Double entaille", description: "Les deux lames frappent rapidement la cible.", icon: "🗡️", category: "active", cooldown: 4, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.595, hits: 2 }] }),
  daggerFlurry: ability({ id: "ability_dagger_flurry", name: "Rafale de lames", description: "Une rafale de coups ouvre la garde et prépare la prochaine attaque signature.", icon: "⚔", category: "active", cooldown: 8, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 0.782, hits: 4 }, { kind: "status", effectId: "effect_dagger_opening", effectType: "debuff", duration: 4, statId: "stat_auto_attack_damage_taken_bonus", statDelta: 10 }, { kind: "status", effectId: "effect_dagger_combo_ready", effectType: "debuff", duration: 12 }] }),
  daggerPairCrossAssault: ability({ id: "ability_dagger_pair_cross_assault", name: "Assaut croisé", description: "Deux frappes croisées. Rafale de lames renforce l'assaut, qui gagne aussi en puissance contre une cible presque achevée.", icon: "🗡️", category: "active", cooldown: 8, castTime: 0, resourceCost: {}, interruptible: false, targetRule: "current_target", damageType: "physical" }, { mechanics: [{ kind: "damage", ratio: 1.85, hits: 2, bonusEffect: { effectId: "effect_dagger_combo_ready", bonusRatio: 0.95 }, bonusHealthBelow: { ratio: 0.2, bonusRatio: 0.52 } }, { kind: "consume_effect", effectId: "effect_dagger_combo_ready" }] }),
} as const satisfies Readonly<Record<string, AuthoredWeaponAbilityDefinition>>;
