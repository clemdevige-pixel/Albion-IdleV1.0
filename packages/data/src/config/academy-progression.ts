export type AcademyResearchTier = 4 | 5 | 6 | 7 | 8;

export interface AcademyLevelDefinition {
  readonly level: number;
  readonly researchTier: AcademyResearchTier;
  readonly minimumIslandLevel: number;
}

/**
 * Academy tier progression is paid through the global Island Level upgrade.
 * Once constructed, the Academy mirrors the highest tier unlocked by the
 * current Island Level instead of owning a second upgrade-cost curve.
 */
export const ACADEMY_LEVELS = [
  { level: 1, researchTier: 4, minimumIslandLevel: 2 },
  { level: 2, researchTier: 5, minimumIslandLevel: 3 },
  { level: 3, researchTier: 6, minimumIslandLevel: 4 },
  { level: 4, researchTier: 7, minimumIslandLevel: 5 },
  { level: 5, researchTier: 8, minimumIslandLevel: 6 },
] as const satisfies readonly AcademyLevelDefinition[];

export function getAcademyLevelDefinition(level: number): AcademyLevelDefinition | undefined {
  return ACADEMY_LEVELS.find((entry) => entry.level === level);
}

export function getAcademyResearchTier(level: number): AcademyResearchTier | undefined {
  return getAcademyLevelDefinition(level)?.researchTier;
}
