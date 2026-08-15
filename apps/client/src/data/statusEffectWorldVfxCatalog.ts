export type StatusEffectWorldVfx = "burning";
export type StatusEffectWorldTarget = "enemy" | "player";

export interface StatusEffectWorldVfxDefinition {
  readonly style: StatusEffectWorldVfx;
  readonly target: StatusEffectWorldTarget;
}

const STATUS_EFFECT_WORLD_VFX: Readonly<Record<string, StatusEffectWorldVfxDefinition>> = {
  effect_fire_burn: { style: "burning", target: "enemy" },
  effect_fire_cataclysm: { style: "burning", target: "enemy" },
};

export function resolveStatusEffectWorldVfx(
  effectId: string,
): StatusEffectWorldVfxDefinition | undefined {
  return STATUS_EFFECT_WORLD_VFX[effectId];
}
