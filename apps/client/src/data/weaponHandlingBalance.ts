import type { EquipmentInfoLike } from "@game/gameplay";

export type WeaponHandling = EquipmentInfoLike["handling"];

/**
 * Offensive budget by weapon handling.
 * One-handed weapons retain access to an off-hand slot; two-handed weapons
 * receive a compensating offensive premium from data rather than runtime
 * item-specific conditions.
 */
export const WEAPON_HANDLING_OFFENSIVE_MULTIPLIER: Readonly<Record<WeaponHandling, number>> = {
  one_handed: 1,
  two_handed: 1.25,
};

export function getWeaponHandlingOffensiveMultiplier(handling: WeaponHandling): number {
  return WEAPON_HANDLING_OFFENSIVE_MULTIPLIER[handling];
}
