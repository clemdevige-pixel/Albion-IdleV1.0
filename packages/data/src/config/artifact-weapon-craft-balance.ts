import type { DungeonArtifactTier } from "./dungeon-artifacts.js";
import {
  FINE_CLOTH_RECIPE,
  PINE_PLANK_RECIPE,
  THICK_LEATHER_RECIPE,
} from "./refining-content.js";

/** Tier-scaled faction Rune cost added to every artifact weapon craft. */
export const ARTIFACT_WEAPON_RUNE_COST_BY_TIER = {
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 10,
} as const satisfies Readonly<Record<DungeonArtifactTier, number>>;

/**
 * Temporary T4 bootstrap recipe retained until Badon uses the complete artifact-crafting loop.
 * Authored here so the client never owns its material quantities.
 */
export const BADON_TEMPORARY_RECIPE = {
  id: "CRAFT_BADON_T4_0",
  family: "bow",
  name: "Badon T4",
  tier: 4,
  outputItemId: "item_weapon_bow_t4_badon",
  durationTicks: 0,
  requirements: [
    { itemId: PINE_PLANK_RECIPE.outputItemId, quantity: 8 },
    { itemId: THICK_LEATHER_RECIPE.outputItemId, quantity: 4 },
    { itemId: FINE_CLOTH_RECIPE.outputItemId, quantity: 2 },
  ],
} as const;
