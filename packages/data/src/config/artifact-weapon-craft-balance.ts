import type { DungeonArtifactTier } from "./dungeon-artifacts.js";

/** Tier-scaled faction Rune cost added to every artifact weapon craft. */
export const ARTIFACT_WEAPON_RUNE_COST_BY_TIER = {
  4: 5,
  5: 10,
  6: 20,
  7: 35,
  8: 55,
} as const satisfies Readonly<Record<DungeonArtifactTier, number>>;
