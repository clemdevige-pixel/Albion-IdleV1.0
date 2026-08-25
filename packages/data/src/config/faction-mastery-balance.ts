/** Canonical faction mastery balance. */
export const FACTION_MASTERY_MAX_LEVEL = 100;
export const FACTION_MASTERY_YIELD_PERCENT_PER_LEVEL = 0.5;

/**
 * Cumulative XP at level L is 1,500 * L².
 * Consumers needing incremental level costs use the delta between consecutive levels.
 */
export const FACTION_MASTERY_XP_PER_LEVEL = Array.from(
  { length: FACTION_MASTERY_MAX_LEVEL },
  (_, index) => {
    const level = index + 1;
    const cumulativeAtLevel = 1_500 * level * level;
    const previousLevel = level - 1;
    const cumulativeBefore = 1_500 * previousLevel * previousLevel;
    return cumulativeAtLevel - cumulativeBefore;
  },
);
