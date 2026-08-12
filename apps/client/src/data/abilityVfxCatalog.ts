export type AbilityVfxKind = "slash" | "burst" | "pierce" | "storm" | "shockwave";

export interface AbilityVfxDefinition {
  readonly kind: AbilityVfxKind;
  readonly color: number;
  readonly scale: number;
  readonly durationMs: number;
  readonly strokeWidth: number;
  readonly layers: number;
}

/**
 * Presentation-only ability data. Gameplay runtimes never branch on ability ids;
 * the renderer resolves a generic VFX definition from this catalog.
 */
export const ABILITY_VFX_CATALOG: Readonly<Record<string, AbilityVfxDefinition>> = {
  // Broadsword
  ability_sword_heroic_strike: {
    kind: "slash",
    color: 0xffd27a,
    scale: 0.9,
    durationMs: 170,
    strokeWidth: 4,
    layers: 1,
  },
  ability_sword_guard_breaker: {
    kind: "slash",
    color: 0xff9a4d,
    scale: 1.15,
    durationMs: 230,
    strokeWidth: 5,
    layers: 2,
  },
  ability_sword_execution: {
    kind: "burst",
    color: 0xffe5a3,
    scale: 1.5,
    durationMs: 360,
    strokeWidth: 7,
    layers: 3,
  },

  // Longbow (and Badon's shared aimed shot)
  ability_bow_aimed_shot: {
    kind: "pierce",
    color: 0xd9f0a3,
    scale: 0.85,
    durationMs: 180,
    strokeWidth: 3,
    layers: 1,
  },
  ability_bow_piercing_arrow: {
    kind: "pierce",
    color: 0xeaffbf,
    scale: 1.1,
    durationMs: 230,
    strokeWidth: 4,
    layers: 2,
  },
  ability_bow_deadeye: {
    kind: "burst",
    color: 0xf7ffd6,
    scale: 1.35,
    durationMs: 330,
    strokeWidth: 5,
    layers: 3,
  },

  // Badon
  ability_bow_badon_storm_arrow: {
    kind: "storm",
    color: 0x8bd8ff,
    scale: 1.1,
    durationMs: 260,
    strokeWidth: 4,
    layers: 2,
  },
  ability_bow_badon_raging_storm: {
    kind: "storm",
    color: 0xb8ecff,
    scale: 1.55,
    durationMs: 430,
    strokeWidth: 6,
    layers: 4,
  },

  // Infernal staff
  ability_fire_fireball: {
    kind: "burst",
    color: 0xff9b42,
    scale: 0.9,
    durationMs: 210,
    strokeWidth: 4,
    layers: 1,
  },
  ability_fire_infernal_burst: {
    kind: "burst",
    color: 0xff5f2e,
    scale: 1.2,
    durationMs: 290,
    strokeWidth: 5,
    layers: 2,
  },
  ability_fire_cataclysm: {
    kind: "storm",
    color: 0xffd16a,
    scale: 1.7,
    durationMs: 480,
    strokeWidth: 7,
    layers: 4,
  },

  // Spiked gauntlets
  ability_gloves_shockwave: {
    kind: "shockwave",
    color: 0xe6d6b5,
    scale: 0.95,
    durationMs: 190,
    strokeWidth: 4,
    layers: 1,
  },
  ability_gloves_breaking_combo: {
    kind: "slash",
    color: 0xffc46b,
    scale: 1.1,
    durationMs: 240,
    strokeWidth: 5,
    layers: 3,
  },
  ability_gloves_seismic_impact: {
    kind: "shockwave",
    color: 0xffe29a,
    scale: 1.55,
    durationMs: 390,
    strokeWidth: 7,
    layers: 4,
  },

  // Dagger pair
  ability_dagger_double_slash: {
    kind: "slash",
    color: 0xd9e6ff,
    scale: 0.85,
    durationMs: 150,
    strokeWidth: 3,
    layers: 2,
  },
  ability_dagger_flurry: {
    kind: "slash",
    color: 0xc5a7ff,
    scale: 1.05,
    durationMs: 210,
    strokeWidth: 4,
    layers: 4,
  },
  ability_dagger_assassination: {
    kind: "pierce",
    color: 0xf1d7ff,
    scale: 1.45,
    durationMs: 320,
    strokeWidth: 6,
    layers: 3,
  },
};

export function resolveAbilityVfx(abilityId: string | undefined): AbilityVfxDefinition | undefined {
  return abilityId === undefined ? undefined : ABILITY_VFX_CATALOG[abilityId];
}
