export type AbilityAutoRule =
  | { readonly kind: "always" }
  | { readonly kind: "target_health_below"; readonly ratio: number }
  | { readonly kind: "target_has_effect"; readonly effectId: string };

export type AbilityMechanic =
  | { readonly kind: "damage"; readonly ratio: number; readonly hits?: number; readonly bonusHealthBelow?: { readonly ratio: number; readonly bonusRatio: number }; readonly bonusEffect?: { readonly effectId: string; readonly bonusRatio: number } }
  | { readonly kind: "status"; readonly effectId: string; readonly effectType: "debuff" | "stun" | "silence"; readonly duration: number; readonly statId?: "stat_armor" | "stat_magic_resistance"; readonly statDelta?: number }
  | { readonly kind: "dot"; readonly effectId: string; readonly ratio: number; readonly interval: number; readonly ticks: number };

export interface AbilityMechanicsProfile {
  readonly autoRule?: AbilityAutoRule;
  readonly mechanics: readonly AbilityMechanic[];
}

/**
 * Authored combat-balance data for weapon abilities.
 * Runtime code consumes these profiles generically; balance values belong here,
 * never in ACTIVE/AFK branches or encounter-specific conditionals.
 */
export const WEAPON_ABILITY_MECHANICS: Readonly<Record<string, AbilityMechanicsProfile>> = {
  // Broadsword: shift pre-M30 power from auto-attacks toward Q/W.
  ability_sword_heroic_strike: { mechanics: [{ kind: "damage", ratio: 0.85125 }] },
  ability_sword_guard_breaker: { mechanics: [{ kind: "damage", ratio: 0.96475 }, { kind: "status", effectId: "effect_sword_armor_break", effectType: "debuff", duration: 5, statId: "stat_armor", statDelta: -12 }] },
  ability_sword_execution: { autoRule: { kind: "target_health_below", ratio: 0.3 }, mechanics: [{ kind: "damage", ratio: 1.55, bonusHealthBelow: { ratio: 0.3, bonusRatio: 0.75 } }] },

  // Longbow family Q/W: first Blue-zone pass, -8% authored ratios.
  ability_bow_aimed_shot: { mechanics: [{ kind: "damage", ratio: 0.552 }] },
  ability_bow_piercing_arrow: { mechanics: [{ kind: "damage", ratio: 0.736 }, { kind: "status", effectId: "effect_bow_pierce", effectType: "debuff", duration: 4, statId: "stat_armor", statDelta: -8 }] },
  ability_bow_deadeye: { mechanics: [{ kind: "damage", ratio: 1.95 }] },
  ability_bow_badon_raging_storm: { mechanics: [{ kind: "damage", ratio: 1.35 }, { kind: "status", effectId: "effect_bow_badon_stun", effectType: "stun", duration: 1.25 }] },

  // Infernal Staff Q/W: -9% across direct, DoT and burn-synergy ratios.
  ability_fire_fireball: { mechanics: [{ kind: "damage", ratio: 0.4095 }, { kind: "dot", effectId: "effect_fire_burn", ratio: 0.0728, interval: 1, ticks: 3 }] },
  ability_fire_infernal_burst: { autoRule: { kind: "target_has_effect", effectId: "effect_fire_burn" }, mechanics: [{ kind: "damage", ratio: 0.728, bonusEffect: { effectId: "effect_fire_burn", bonusRatio: 0.3185 } }] },
  ability_fire_cataclysm: { mechanics: [{ kind: "damage", ratio: 1.2 }, { kind: "dot", effectId: "effect_fire_cataclysm", ratio: 0.12, interval: 1, ticks: 5 }] },

  // Spiked: Q/W carry pre-M30 power. W also provides a short control window so
  // the 2H specialization is less dependent on ACTIVE-only potion sustain.
  // This remains mode-agnostic and is consumed by the generic ability runtime.
  ability_gloves_shockwave: { mechanics: [{ kind: "damage", ratio: 0.896 }] },
  ability_gloves_breaking_combo: { mechanics: [{ kind: "damage", ratio: 1.15, hits: 3 }, { kind: "status", effectId: "effect_gloves_combo_stun", effectType: "stun", duration: 0.75 }] },
  ability_gloves_seismic_impact: { mechanics: [{ kind: "damage", ratio: 1.4 }, { kind: "status", effectId: "effect_gloves_stun", effectType: "stun", duration: 1.5 }] },

  // Dagger Pair: -5% Q/W authored ratios; AA cadence is reduced separately.
  ability_dagger_double_slash: { mechanics: [{ kind: "damage", ratio: 0.475, hits: 2 }] },
  ability_dagger_flurry: { mechanics: [{ kind: "damage", ratio: 0.76, hits: 4 }, { kind: "status", effectId: "effect_dagger_opening", effectType: "debuff", duration: 4 }] },
  ability_dagger_assassination: { autoRule: { kind: "target_has_effect", effectId: "effect_dagger_opening" }, mechanics: [{ kind: "damage", ratio: 1.35, bonusEffect: { effectId: "effect_dagger_opening", bonusRatio: 0.45 } }] },
};

export function getWeaponAbilityMechanics(abilityId: string): AbilityMechanicsProfile | undefined {
  return WEAPON_ABILITY_MECHANICS[abilityId];
}
