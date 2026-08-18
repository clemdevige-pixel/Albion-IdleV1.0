export type WeaponGameplayProfile =
  | "bruiser_execute"
  | "sustain_burst"
  | "control_dps"
  | "dot_ramp_up"
  | "burst_control"
  | "combo_execute";

export type WeaponContentRole =
  | "general_progression"
  | "fame_farm"
  | "boss"
  | "dungeon";

export interface WeaponBalanceProfile {
  readonly specializationMasteryId: string;
  readonly gameplayProfile: WeaponGameplayProfile;
  readonly primaryContentRole: WeaponContentRole;
  readonly secondaryContentRole?: WeaponContentRole;
  readonly balanceExpectation: string;
}

/**
 * Design/balance metadata only.
 *
 * These profiles never grant runtime bonuses. They define what a weapon is
 * expected to be good at so audits and benchmarks compare it against the
 * correct objective instead of forcing every weapon toward the same result.
 */
export const WEAPON_BALANCE_PROFILES: Readonly<Record<string, WeaponBalanceProfile>> = {
  mastery_broadsword: {
    specializationMasteryId: "mastery_broadsword",
    gameplayProfile: "bruiser_execute",
    primaryContentRole: "general_progression",
    secondaryContentRole: "boss",
    balanceExpectation: "Reliable all-round progression weapon with strong finishing pressure; should be safe and consistent without becoming the best Fame farmer or the strongest dedicated boss killer.",
  },
  mastery_longbow: {
    specializationMasteryId: "mastery_longbow",
    gameplayProfile: "sustain_burst",
    primaryContentRole: "fame_farm",
    secondaryContentRole: "general_progression",
    balanceExpectation: "Efficient repeatable PvE clear with low downtime; should convert ordinary world encounters into strong Fame/hour without matching dedicated boss weapons on long single-target fights.",
  },
  mastery_badon: {
    specializationMasteryId: "mastery_badon",
    gameplayProfile: "control_dps",
    primaryContentRole: "dungeon",
    secondaryContentRole: "general_progression",
    balanceExpectation: "Control-oriented PvE weapon that gains value across chained or dangerous encounters; should be particularly comfortable in dungeons without leading pure Fame/hour or boss DPS benchmarks.",
  },
  mastery_infernal_staff: {
    specializationMasteryId: "mastery_infernal_staff",
    gameplayProfile: "dot_ramp_up",
    primaryContentRole: "boss",
    secondaryContentRole: "dungeon",
    balanceExpectation: "Sustained damage weapon rewarded by targets that live long enough for burns and setup to pay off; should improve with encounter duration and lose relative efficiency on very short farm fights.",
  },
  mastery_spiked_gauntlets: {
    specializationMasteryId: "mastery_spiked_gauntlets",
    gameplayProfile: "burst_control",
    primaryContentRole: "fame_farm",
    secondaryContentRole: "dungeon",
    balanceExpectation: "Fast, active clear weapon combining burst and brief control; should excel at dispatching ordinary enemies quickly while remaining useful, but not dominant, in longer dungeon or boss encounters.",
  },
  mastery_dagger_pair: {
    specializationMasteryId: "mastery_dagger_pair",
    gameplayProfile: "combo_execute",
    primaryContentRole: "boss",
    secondaryContentRole: "dungeon",
    balanceExpectation: "Dedicated single-target payoff weapon built around setup into assassination; should rank among the strongest boss killers while giving up consistency and short-fight farming efficiency.",
  },
};

export function resolveWeaponBalanceProfileByMasteryId(
  specializationMasteryId: string,
): WeaponBalanceProfile | undefined {
  return WEAPON_BALANCE_PROFILES[specializationMasteryId];
}
