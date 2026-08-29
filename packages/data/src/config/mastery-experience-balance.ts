export interface MasteryExperienceCurveAuthoring {
  readonly baseXpLevels1To10: readonly number[];
  readonly extensionCoefficient: number;
  readonly extensionExponent: number;
  readonly maxLevel: number;
}

export interface WeaponMasteryExperienceCurveAuthoring extends MasteryExperienceCurveAuthoring {
  readonly generatedThroughLevel: number;
  readonly authoredXpLevels66To100: readonly number[];
}

export const WEAPON_MASTERY_EXPERIENCE_BALANCE: WeaponMasteryExperienceCurveAuthoring = {
  baseXpLevels1To10: [100, 200, 300, 450, 650, 900, 1200, 1600, 2100, 2700],
  extensionCoefficient: 40,
  extensionExponent: 1.90,
  generatedThroughLevel: 65,
  authoredXpLevels66To100: [
    104000, 107000, 111000, 114000, 118000,
    121000, 125000, 130000, 133000, 137000,
    140000, 145000, 149000, 152000, 157000,
    198000, 204000, 209000, 215000, 221000,
    226000, 231000, 237000, 243000, 249000,
    255000, 260000, 266000, 272000, 278000,
    284000, 290000, 297000, 303000, 309000,
  ],
  maxLevel: 100,
};

export const GATHERING_MASTERY_EXPERIENCE_BALANCE: MasteryExperienceCurveAuthoring = {
  baseXpLevels1To10: [50, 100, 175, 275, 400, 550, 750, 1000, 1300, 1700],
  extensionCoefficient: 25,
  extensionExponent: 1.85,
  maxLevel: 100,
};