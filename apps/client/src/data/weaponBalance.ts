export interface WeaponSpecializationBalance {
  readonly autoAttackSpeedMultiplier: number;
}

/**
 * Authored specialization balance data.
 * This is deliberately mode-agnostic: ACTIVE and AFK consume the same weapon stats.
 */
export const WEAPON_SPECIALIZATION_BALANCE: Readonly<Record<string, WeaponSpecializationBalance>> = {
  mastery_broadsword: { autoAttackSpeedMultiplier: 0.9 },
  mastery_spiked_gauntlets: { autoAttackSpeedMultiplier: 0.85 },
  mastery_dagger_pair: { autoAttackSpeedMultiplier: 0.9 },
  mastery_longbow: { autoAttackSpeedMultiplier: 0.95 },
};

export function getWeaponSpecializationBalance(
  specializationMasteryId: string,
): WeaponSpecializationBalance | undefined {
  return WEAPON_SPECIALIZATION_BALANCE[specializationMasteryId];
}
