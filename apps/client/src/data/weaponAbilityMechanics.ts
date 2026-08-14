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
  // Broadsword: active-progression tuning. Q/W are back to authored baseline;
  // AA carries the remaining pre-M30 reduction. E remains unchanged at M30.
  ability_sword_heroic_strike: { mechanics: [{ kind: "damage", ratio: 0.75 }] },
  ability_sword_guard_breaker: { mechanics: [{ kind: "damage", ratio: 0.85 }, { kind: "status", effectId: "effect_sword_armor_break", effectType: "debuff", duration: 5, statId: "stat_armor", statDelta: -12 }] },
  ability_sword_execution: { autoRule: { kind: "target_health_below", ratio: 0.3 }, mechanics: [{ kind: "damage", ratio: 1.55, bonusHealthBelow: { ratio: 0.3, bonusRatio: 0.75 } }] },

  // Longbow: recover from the previous Frostpeak breakpoint overshoot.
  // Q/W sit at -11% from authored baseline; AA returns to baseline cadence.
  ability_bow_aimed_shot: { mechanics: [{ kind: "damage", ratio: 0.534 }] },
  ability_bow_piercing_arrow: { mechanics: [{ kind: "damage", ratio: 0.712 }, { kind: "status", effectId: "effect_bow_pierce", effectType: "debuff", duration: 4, statId: "stat_armor", statDelta: -8 }] },
  ability_bow_deadeye: { mechanics: [{ kind: "damage", ratio: 1.95 }] },
  ability_bow_badon_raging_storm: { mechanics: [{ kind: "damage", ratio: 1.35 }, { kind: "status", effectId: "effect_bow_badon_stun", effectType: "stun", duration: 1.25 }] },

  // Infernal Staff: -20% Q/W package from authored baseline.
  ability_fire_fireball: { mechanics: [{ kind: "damage", ratio: 0.36 }, { kind: "dot", effectId: "effect_fire_burn", ratio: 0.064, interval: 1, ticks: 3 }] },
  ability_fire_infernal_burst: { autoRule: { kind: "target_has_effect", effectId: "effect_fire_burn" }, mechanics: [{ kind: "damage", ratio: 0.64, bonusEffect: { effectId: "effect_fire_burn", bonusRatio: 0.28 } }] },
  ability_fire_cataclysm: { mechanics: [{ kind: "damage", ratio: 1.2 }, { kind: "dot", effectId: "effect_fire_cataclysm", ratio: 0.12, interval: 1, ticks: 5 }] },

  // Spiked: active-progression tuning only; no AFK-specific control.
  // Q/W are -3% from authored baseline and AA carries the larger reduction.
  ability_gloves_shockwave: { mechanics: [{ kind: "damage", ratio: 0.776 }] },
  ability_gloves_breaking_combo: { mechanics: [{ kind: "damage", ratio: 0.97, hits: 3 }] },
  ability_gloves_seismic_impact: { mechanics: [{ kind: "damage", ratio: 1.4 }, { kind: "status", effectId: "effect_gloves_stun", effectType: "stun", duration: 1.5 }] },

  // Dagger Pair: -13% Q/W from authored baseline; AA cadence is reduced separately.
  ability_dagger_double_slash: { mechanics: [{ kind: "damage", ratio: 0.435, hits: 2 }] },
  ability_dagger_flurry: { mechanics: [{ kind: "damage", ratio: 0.696, hits: 4 }, { kind: "status", effectId: "effect_dagger_opening", effectType: "debuff", duration: 4 }] },
  ability_dagger_assassination: { autoRule: { kind: "target_has_effect", effectId: "effect_dagger_opening" }, mechanics: [{ kind: "damage", ratio: 1.35, bonusEffect: { effectId: "effect_dagger_opening", bonusRatio: 0.45 } }] },
};

export function getWeaponAbilityMechanics(abilityId: string): AbilityMechanicsProfile | undefined {
  return WEAPON_ABILITY_MECHANICS[abilityId];
}
