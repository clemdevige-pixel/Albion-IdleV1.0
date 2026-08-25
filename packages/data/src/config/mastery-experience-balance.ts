export interface MasteryExperienceCurveAuthoring {
  readonly baseXpLevels1To10: readonly number[];
  readonly extensionCoefficient: number;
  readonly extensionExponent: number;
  readonly maxLevel: number;
}

export const WEAPON_MASTERY_EXPERIENCE_BALANCE: MasteryExperienceCurveAuthoring = {
  baseXpLevels1To10: [100, 200, 300, 450, 650, 900, 1200, 1600, 2100, 2700],
  extensionCoefficient: 40,
  extensionExponent: 1.90,
  maxLevel: 100,
};

export const GATHERING_MASTERY_EXPERIENCE_BALANCE: MasteryExperienceCurveAuthoring = {
  baseXpLevels1To10: [50, 100, 175, 275, 400, 550, 750, 1000, 1300, 1700],
  extensionCoefficient: 25,
  extensionExponent: 1.85,
  maxLevel: 100,
};
