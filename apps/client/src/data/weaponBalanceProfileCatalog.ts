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

export type WeaponBalanceFamilyId = "sword" | "bow" | "fire_staff" | "gloves" | "dagger";
export type WeaponSpecializationShift = "minor" | "moderate" | "transformative_exception";

export interface WeaponFamilyBalanceProfile {
  readonly familyId: WeaponBalanceFamilyId;
  readonly gameplayIdentity: string;
  readonly naturalContentRole: WeaponContentRole;
  readonly balanceExpectation: string;
}

export interface WeaponBalanceProfile {
  readonly specializationMasteryId: string;
  readonly familyId: WeaponBalanceFamilyId;
  readonly gameplayProfile: WeaponGameplayProfile;
  readonly primaryContentRole: WeaponContentRole;
  readonly secondaryContentRole?: WeaponContentRole;
  readonly specializationShift: WeaponSpecializationShift;
  readonly balanceExpectation: string;
}

/**
 * Family identity is the dominant balance contract because Q/W abilities are
 * shared inside a family. A specialization normally nudges that identity via
 * its signature ability; it does not replace it.
 */
export const WEAPON_FAMILY_BALANCE_PROFILES: Readonly<Record<WeaponBalanceFamilyId, WeaponFamilyBalanceProfile>> = {
  sword: {
    familyId: "sword",
    gameplayIdentity: "Reliable melee pressure with finishing power and strong build flexibility through one-handed handling.",
    naturalContentRole: "general_progression",
    balanceExpectation: "Sword specializations should remain reliable progression weapons first; signatures may push execute, burst, defense or another nearby niche without discarding that core identity.",
  },
  bow: {
    familyId: "bow",
    gameplayIdentity: "Repeatable ranged pressure with low downtime and efficient ordinary-PvE clearing.",
    naturalContentRole: "fame_farm",
    balanceExpectation: "Bow specializations should preserve efficient ranged clearing; signatures may shift toward burst, control or dungeon utility without becoming unrelated archetypes.",
  },
  fire_staff: {
    familyId: "fire_staff",
    gameplayIdentity: "Magical damage built around burn setup, sustained pressure and payoff over time.",
    naturalContentRole: "boss",
    balanceExpectation: "Fire Staff specializations should preserve burn/sustained-damage identity while signatures alter payoff shape, timing or secondary utility.",
  },
  gloves: {
    familyId: "gloves",
    gameplayIdentity: "Fast active melee pressure combining repeated hits, burst windows and disruptive impact.",
    naturalContentRole: "fame_farm",
    balanceExpectation: "Glove specializations should stay active and fast-clearing; signatures may lean further into burst, control or another adjacent combat niche.",
  },
  dagger: {
    familyId: "dagger",
    gameplayIdentity: "Fast melee setup into concentrated single-target payoff.",
    naturalContentRole: "boss",
    balanceExpectation: "Dagger specializations should preserve setup/payoff and single-target pressure; signatures may change execution pattern without turning the family into a fundamentally different role.",
  },
};

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
    familyId: "sword",
    gameplayProfile: "bruiser_execute",
    primaryContentRole: "general_progression",
    secondaryContentRole: "boss",
    specializationShift: "moderate",
    balanceExpectation: "Reliable all-round progression weapon with strong finishing pressure; should be safe and consistent without becoming the best Fame farmer or the strongest dedicated boss killer.",
  },
  mastery_longbow: {
    specializationMasteryId: "mastery_longbow",
    familyId: "bow",
    gameplayProfile: "sustain_burst",
    primaryContentRole: "fame_farm",
    secondaryContentRole: "general_progression",
    specializationShift: "minor",
    balanceExpectation: "Efficient repeatable PvE clear with low downtime; should convert ordinary world encounters into strong Fame/hour without matching dedicated boss weapons on long single-target fights.",
  },
  mastery_badon: {
    specializationMasteryId: "mastery_badon",
    familyId: "bow",
    gameplayProfile: "control_dps",
    primaryContentRole: "dungeon",
    secondaryContentRole: "general_progression",
    specializationShift: "moderate",
    balanceExpectation: "Control-oriented Bow specialization that keeps the family's ranged-clear foundation but redirects part of its value toward chained or dangerous dungeon encounters.",
  },
  mastery_infernal_staff: {
    specializationMasteryId: "mastery_infernal_staff",
    familyId: "fire_staff",
    gameplayProfile: "dot_ramp_up",
    primaryContentRole: "boss",
    secondaryContentRole: "dungeon",
    specializationShift: "minor",
    balanceExpectation: "Sustained damage weapon rewarded by targets that live long enough for burns and setup to pay off; should improve with encounter duration and lose relative efficiency on very short farm fights.",
  },
  mastery_spiked_gauntlets: {
    specializationMasteryId: "mastery_spiked_gauntlets",
    familyId: "gloves",
    gameplayProfile: "burst_control",
    primaryContentRole: "fame_farm",
    secondaryContentRole: "dungeon",
    specializationShift: "minor",
    balanceExpectation: "Fast, active clear weapon combining burst and brief control; should excel at dispatching ordinary enemies quickly while remaining useful, but not dominant, in longer dungeon or boss encounters.",
  },
  mastery_dagger_pair: {
    specializationMasteryId: "mastery_dagger_pair",
    familyId: "dagger",
    gameplayProfile: "combo_execute",
    primaryContentRole: "boss",
    secondaryContentRole: "dungeon",
    specializationShift: "minor",
    balanceExpectation: "Dedicated single-target payoff weapon built around setup into assassination; should rank among the strongest boss killers while giving up consistency and short-fight farming efficiency.",
  },
};

export function resolveWeaponFamilyBalanceProfile(
  familyId: WeaponBalanceFamilyId,
): WeaponFamilyBalanceProfile {
  return WEAPON_FAMILY_BALANCE_PROFILES[familyId];
}

export function resolveWeaponBalanceProfileByMasteryId(
  specializationMasteryId: string,
): WeaponBalanceProfile | undefined {
  return WEAPON_BALANCE_PROFILES[specializationMasteryId];
}
