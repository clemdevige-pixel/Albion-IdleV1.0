export type AcademyResearchTier = 4 | 5 | 6 | 7 | 8;

export interface AcademyLevelDefinition {
  readonly level: number;
  readonly researchTier: AcademyResearchTier;
}

/**
 * Academy progression is intentionally separate from production-building progression.
 * Only the validated initial T4 level is authored until later upgrade costs are calibrated.
 */
export const ACADEMY_LEVELS: readonly AcademyLevelDefinition[] = [
  { level: 1, researchTier: 4 },
] as const;

export function getAcademyResearchTier(level: number): AcademyResearchTier | undefined {
  return ACADEMY_LEVELS.find((definition) => definition.level === level)?.researchTier;
}
