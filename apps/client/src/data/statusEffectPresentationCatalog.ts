export interface StatusEffectPresentationDefinition {
  readonly label: string;
  readonly symbol: string;
}

const STATUS_EFFECT_PRESENTATIONS: Readonly<Record<string, StatusEffectPresentationDefinition>> = {
  effect_fire_burn: { label: "Brûlure", symbol: "🔥" },
  effect_fire_cataclysm: { label: "Cataclysme", symbol: "🔥" },
};

export function resolveStatusEffectPresentation(
  effectId: string,
): StatusEffectPresentationDefinition | undefined {
  return STATUS_EFFECT_PRESENTATIONS[effectId];
}
