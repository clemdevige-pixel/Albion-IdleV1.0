import { CLIENT_ABILITIES } from "./weaponContentCatalog";
import { WEAPON_ABILITY_MECHANICS } from "./weaponAbilityMechanics";

export interface StatusEffectDotDetails {
  readonly ratio: number;
  readonly interval: number;
  readonly ticks: number;
  readonly damageType: "physical" | "magical";
}

const ABILITY_DAMAGE_TYPES = CLIENT_ABILITIES as Readonly<
  Record<string, { readonly damageType: "physical" | "magical" }>
>;

/** Derives DoT tooltip data from the authoritative weapon mechanics. */
export function resolveStatusEffectDotDetails(effectId: string): StatusEffectDotDetails | undefined {
  for (const [abilityId, profile] of Object.entries(WEAPON_ABILITY_MECHANICS)) {
    const dot = profile.mechanics.find(
      (mechanic) => mechanic.kind === "dot" && mechanic.effectId === effectId,
    );
    if (dot === undefined || dot.kind !== "dot") continue;
    const ability = ABILITY_DAMAGE_TYPES[abilityId];
    if (ability === undefined) continue;
    return {
      ratio: dot.ratio,
      interval: dot.interval,
      ticks: dot.ticks,
      damageType: ability.damageType,
    };
  }
  return undefined;
}
