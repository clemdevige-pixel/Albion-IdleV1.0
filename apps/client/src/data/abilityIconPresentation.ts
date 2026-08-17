import type { StatusEffectDisplayType } from "./statusEffectPresentationCatalog";

const ABILITY_ICON_ROOT = "/assets/abilities";

const STATUS_EFFECT_ICON_PATHS: Readonly<Record<string, string>> = {
  effect_sword_armor_break: `${ABILITY_ICON_ROOT}/effect_sword_armor_break.png`,
  effect_dagger_opening: `${ABILITY_ICON_ROOT}/effect_dagger_opening.png`,
  effect_fire_burn: `${ABILITY_ICON_ROOT}/status_burn.png`,
  effect_fire_cataclysm: `${ABILITY_ICON_ROOT}/status_burn.png`,
  effect_bow_badon_stun: `${ABILITY_ICON_ROOT}/status_stun.png`,
  effect_gloves_stun: `${ABILITY_ICON_ROOT}/status_stun.png`,
};

const GENERIC_STATUS_ICON_PATHS: Partial<Record<StatusEffectDisplayType, string>> = {
  stun: `${ABILITY_ICON_ROOT}/status_stun.png`,
};

export function resolveAbilityIconPath(abilityId: string): string {
  return `${ABILITY_ICON_ROOT}/${abilityId}.png`;
}

export function resolveStatusEffectIconPath(
  effectId: string,
  effectType: StatusEffectDisplayType,
): string | undefined {
  return STATUS_EFFECT_ICON_PATHS[effectId] ?? GENERIC_STATUS_ICON_PATHS[effectType];
}
