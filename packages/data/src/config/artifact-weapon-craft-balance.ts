import type { DungeonArtifactTier } from "./dungeon-artifacts.js";

/** Tier-scaled faction Rune cost added to every artifact weapon craft. */
export const ARTIFACT_WEAPON_RUNE_COST_BY_TIER = {
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 10,
} as const satisfies Readonly<Record<DungeonArtifactTier, number>>;
