export interface WeaponSpecializationBalance {
  readonly autoAttackSpeedMultiplier: number;
}

/**
 * Authored specialization balance data.
 * This is deliberately mode-agnostic: ACTIVE and AFK consume the same weapon stats.
 *
 * Current starter-weapon contract:
 * - Dual Dagger is the practical offensive center of the validated Blue benchmark.
 * - Broadsword intentionally sits below the 2H offensive center because its shield
 *   contributes a materially stronger defensive envelope; its AA cadence is tuned
 *   so total offense targets roughly 82-85% of the practical reference.
 * - Spiked Gauntlets sit only slightly below the reference and receive a small AA
 *   correction rather than a kit-wide rewrite.
 */
export const WEAPON_SPECIALIZATION_BALANCE: Readonly<Record<string, WeaponSpecializationBalance>> = {
  mastery_broadsword: { autoAttackSpeedMultiplier: 1.08 },
  mastery_spiked_gauntlets: { autoAttackSpeedMultiplier: 0.86 },
  mastery_dagger_pair: { autoAttackSpeedMultiplier: 0.87 },
};

export function getWeaponSpecializationBalance(
  specializationMasteryId: string,
): WeaponSpecializationBalance | undefined {
  return WEAPON_SPECIALIZATION_BALANCE[specializationMasteryId];
}
