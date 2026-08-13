import type { EquipmentInfoLike } from "@game/gameplay";

export type WeaponHandling = EquipmentInfoLike["handling"];

/**
 * Offensive budget by weapon handling.
 * One-handed weapons retain access to an off-hand slot; two-handed weapons
 * receive a compensating offensive premium from data rather than runtime
 * item-specific conditions.
 *
 * The initial 1.25 premium proved insufficient in live progression testing
 * against an enchanted one-handed weapon + shield loadout. 1.40 remains a
 * single data-driven handling rule while giving two-handed builds a clearer
 * offensive tradeoff for surrendering the off-hand slot.
 */
export const WEAPON_HANDLING_OFFENSIVE_MULTIPLIER: Readonly<Record<WeaponHandling, number>> = {
  none: 1,
  one_handed: 1,
  two_handed: 1.4,
};

export function getWeaponHandlingOffensiveMultiplier(handling: WeaponHandling): number {
  return WEAPON_HANDLING_OFFENSIVE_MULTIPLIER[handling];
}
