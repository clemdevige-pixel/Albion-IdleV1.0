import {
  CLIENT_ABILITIES,
  type AbilityMechanicsProfile,
} from "./weaponContentCatalog.js";

export type { AbilityAutoRule, AbilityMechanic, AbilityMechanicsProfile } from "./weaponContentCatalog.js";

/**
 * Compatibility projection for existing benchmark/runtime consumers.
 * Weapon mechanics are authored only on ClientAbilityDefinition in
 * weaponContentCatalog; this map must never contain independent balance data.
 */
export const WEAPON_ABILITY_MECHANICS: Readonly<Record<string, AbilityMechanicsProfile>> =
  Object.fromEntries(
    Object.values(CLIENT_ABILITIES).map((ability) => [ability.id, ability.mechanics] as const),
  );

export function getWeaponAbilityMechanics(abilityId: string): AbilityMechanicsProfile | undefined {
  return CLIENT_ABILITIES[abilityId]?.mechanics;
}
