export type StatusEffectDisplayType = "buff" | "debuff" | "stun" | "root" | "slow" | "silence";
export type StatusEffectAnchor = "player" | "enemy";

export interface StatusEffectPresentationDefinition {
  readonly label: string;
  readonly symbol: string;
  readonly description: string;
  readonly anchor?: StatusEffectAnchor;
}

const STATUS_EFFECT_PRESENTATIONS: Readonly<Record<string, StatusEffectPresentationDefinition>> = {
  effect_sword_armor_break: {
    label: "Armure brisée",
    symbol: "−",
    description: "L'armure de la cible est temporairement réduite.",
    anchor: "enemy",
  },
  effect_dagger_opening: {
    label: "Garde ouverte",
    symbol: "−",
    description: "La cible est exposée et devient vulnérable à Assassinat.",
    anchor: "enemy",
  },
  effect_fire_burn: {
    label: "Brûlure",
    symbol: "🔥",
    description: "Subit des dégâts de feu périodiques.",
    anchor: "enemy",
  },
  effect_fire_cataclysm: {
    label: "Cataclysme",
    symbol: "🔥",
    description: "Subit les flammes persistantes de Cataclysme.",
    anchor: "enemy",
  },
  effect_bow_badon_stun: {
    label: "Étourdissement",
    symbol: "!",
    description: "La cible est temporairement incapable d'agir.",
    anchor: "enemy",
  },
  effect_gloves_stun: {
    label: "Étourdissement",
    symbol: "!",
    description: "La cible est temporairement incapable d'agir.",
    anchor: "enemy",
  },
};

const DEFAULT_SYMBOLS: Readonly<Record<StatusEffectDisplayType, string>> = {
  buff: "+",
  debuff: "−",
  stun: "!",
  root: "#",
  slow: "~",
  silence: "×",
};

function humanizeEffectId(effectId: string): string {
  return effectId
    .replace(/^effect_/, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveStatusEffectPresentation(
  effectId: string,
  effectType: StatusEffectDisplayType = "debuff",
): StatusEffectPresentationDefinition {
  const authored = STATUS_EFFECT_PRESENTATIONS[effectId];
  if (authored !== undefined) return authored;

  return {
    label: humanizeEffectId(effectId),
    symbol: DEFAULT_SYMBOLS[effectType],
    description: effectType === "buff" ? "Effet bénéfique actif." : "Effet négatif actif.",
    anchor: effectType === "buff" ? "player" : "enemy",
  };
}

export function resolveStatusEffectAnchor(
  effectId: string,
  effectType: StatusEffectDisplayType,
): StatusEffectAnchor {
  return resolveStatusEffectPresentation(effectId, effectType).anchor
    ?? (effectType === "buff" ? "player" : "enemy");
}
