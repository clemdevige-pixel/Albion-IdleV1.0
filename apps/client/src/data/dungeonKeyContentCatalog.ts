import type { WorldBandId } from "@game/data";

export type DungeonKeyTier = 4 | 5 | 6 | 7 | 8;

/**
 * Dungeon entry currency follows world progression, never monster faction.
 * A key of tier Tx opens any dungeon authored at tier Tx.
 */
export const DUNGEON_KEY_TIER_BY_WORLD_BAND = {
  blue: 4,
  yellow: 5,
  orange: 6,
  red: 7,
  black: 8,
} as const satisfies Readonly<Record<WorldBandId, DungeonKeyTier>>;

export function getDungeonKeyTierForWorldBand(bandId: WorldBandId): DungeonKeyTier {
  return DUNGEON_KEY_TIER_BY_WORLD_BAND[bandId];
}

export function getDungeonKeyFragmentItemId(tier: DungeonKeyTier): string {
  return `item_resource_dungeon_key_fragment_t${tier}`;
}

export function getDungeonKeyItemId(tier: DungeonKeyTier): string {
  return `item_resource_dungeon_key_t${tier}`;
}
