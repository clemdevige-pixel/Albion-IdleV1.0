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
  // Broadsword: active-progression pass. E remains unchanged at M30.
  ability_sword_heroic_strike: { mechanics: [{ kind: "damage", ratio: 0.7875 }] },
  ability_sword_guard_breaker: { mechanics: [{ kind: "damage", ratio: 0.8925 }, { kind: "status", effectId: "effect_sword_armor_break", effectType: "debuff", duration: 5, statId: "stat_armor", statDelta: -12 }] },
  ability_sword_execution: { autoRule: { kind: "target_health_below", ratio: 0.3 }, mechanics: [{ kind: "damage", ratio: 1.55, bonusHealthBelow: { ratio: 0.3, bonusRatio: 0.75 } }] },

  // Longbow: active-progression pass, -15% Q/W from authored baseline.
  ability_bow_aimed_shot: { mechanics: [{ kind: "damage", ratio: 0.51 }] },
  ability_bow_piercing_arrow: { mechanics: [{ kind: "damage", ratio: 0.68 }, { kind: "status", effectId: "effect_bow_pierce", effectType: "debuff", duration: 4, statId: "stat_armor", statDelta: -8 }] },
  ability_bow_deadeye: { mechanics: [{ kind: "damage", ratio: 1.95 }] },
  ability_bow_badon_raging_storm: { mechanics: [{ kind: "damage", ratio: 1.35 }, { kind: "status", effectId: "effect_bow_badon_stun", effectType: "stun", duration: 1.25 }] },

  // Infernal Staff: active-progression pass, -15% Q/W from authored baseline.
  ability_fire_fireball: { mechanics: [{ kind: "damage", ratio: 0.3825 }, { kind: "dot", effectId: "effect_fire_burn", ratio: 0.068, interval: 1, ticks: 3 }] },
  ability_fire_infernal_burst: { autoRule: { kind: "target_has_effect", effectId: "effect_fire_burn" }, mechanics: [{ kind: "damage", ratio: 0.68, bonusEffect: { effectId: "effect_fire_burn", bonusRatio: 0.2975 } }] },
  ability_fire_cataclysm: { mechanics: [{ kind: "damage", ratio: 1.2 }, { kind: "dot", effectId: "effect_fire_cataclysm", ratio: 0.12, interval: 1, ticks: 5 }] },

  // Spiked: active-progression pass. The temporary AFK-motivated W stun is removed.
  ability_gloves_shockwave: { mechanics: [{ kind: "damage", ratio: 0.84 }] },
  ability_gloves_breaking_combo: { mechanics: [{ kind: "damage", ratio: 1.05, hits: 3 }] },
  ability_gloves_seismic_impact: { mechanics: [{ kind: "damage", ratio: 1.4 }, { kind: "status", effectId: "effect_gloves_stun", effectType: "stun", duration: 1.5 }] },

  // Dagger Pair: active-progression pass, -10% Q/W from authored baseline.
  ability_dagger_double_slash: { mechanics: [{ kind: "damage", ratio: 0.45, hits: 2 }] },
  ability_dagger_flurry: { mechanics: [{ kind: "damage", ratio: 0.72, hits: 4 }, { kind: "status", effectId: "effect_dagger_opening", effectType: "debuff", duration: 4 }] },
  ability_dagger_assassination: { autoRule: { kind: "target_has_effect", effectId: "effect_dagger_opening" }, mechanics: [{ kind: "damage", ratio: 1.35, bonusEffect: { effectId: "effect_dagger_opening", bonusRatio: 0.45 } }] },
};

export function getWeaponAbilityMechanics(abilityId: string): AbilityMechanicsProfile | undefined {
  return WEAPON_ABILITY_MECHANICS[abilityId];
}
