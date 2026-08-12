export type AbilityVfxKind = "slash" | "burst";

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
};

export function resolveAbilityVfx(abilityId: string | undefined): AbilityVfxDefinition | undefined {
  return abilityId === undefined ? undefined : ABILITY_VFX_CATALOG[abilityId];
}
