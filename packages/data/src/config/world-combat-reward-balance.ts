import type { WorldBandId } from "./world-bands.js";

export interface WorldCombatRewardCurve {
  readonly silverBase: number;
  readonly silverPerProgressionRank: number;
  readonly fameBase: number;
  readonly famePerProgressionRank: number;
}

/**
 * Canonical World encounter reward curves.
 *
 * Blue through Orange retain the validated baseline. Red and Black are authored
 * directly at the recalibrated late-game values so higher-tier World content
 * remains the strongest Silver/Fame farm after lower-tier revisiting is opened.
 */
export const WORLD_COMBAT_REWARD_CURVES: Readonly<Record<WorldBandId, WorldCombatRewardCurve>> = {
  blue: {
    silverBase: 10,
    silverPerProgressionRank: 3,
    fameBase: 15,
    famePerProgressionRank: 4,
  },
  yellow: {
    silverBase: 10,
    silverPerProgressionRank: 3,
    fameBase: 15,
    famePerProgressionRank: 4,
  },
  orange: {
    silverBase: 10,
    silverPerProgressionRank: 3,
    fameBase: 15,
    famePerProgressionRank: 4,
  },
  red: {
    silverBase: 12,
    silverPerProgressionRank: 3.6,
    fameBase: 18,
    famePerProgressionRank: 4.8,
  },
  black: {
    silverBase: 14.8,
    silverPerProgressionRank: 4.44,
    fameBase: 22.2,
    famePerProgressionRank: 5.92,
  },
} as const;

export function getWorldCombatRewardCurve(bandId: WorldBandId): WorldCombatRewardCurve {
  return WORLD_COMBAT_REWARD_CURVES[bandId];
}
