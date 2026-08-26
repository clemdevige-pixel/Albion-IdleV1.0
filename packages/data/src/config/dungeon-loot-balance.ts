export type DungeonLootTier = 4 | 5 | 6 | 7 | 8;
export type DungeonLootEncounterKind = "normal" | "elite" | "boss";

export interface DungeonEncounterLootBalance {
  readonly artifactFragmentQuantity: number;
  readonly artifactDropChance: number;
  readonly enchantmentShardQuantity: number;
}

export const DUNGEON_COMPLETION_SILVER_BY_TIER: Readonly<Record<DungeonLootTier, number>> = {
  4: 2_500,
  5: 5_000,
  6: 10_000,
  7: 20_000,
  8: 40_000,
} as const;

/** Guaranteed matching-tier Faction Runes granted once on dungeon completion. */
export const DUNGEON_COMPLETION_FACTION_RUNES_BY_TIER: Readonly<Record<DungeonLootTier, number>> = {
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
} as const;

/**
 * Dungeon shards are intentionally a collateral reward for faction/artifact farming,
 * not a replacement for open-world shard progression. Full-run totals are:
 * T4=5, T5=6, T6=8, T7=10, T8=12.
 */
export const DUNGEON_ENCOUNTER_LOOT_BY_TIER: Readonly<
  Record<DungeonLootTier, Readonly<Record<DungeonLootEncounterKind, DungeonEncounterLootBalance>>>
> = {
  4: {
    normal: { artifactFragmentQuantity: 4, artifactDropChance: 0, enchantmentShardQuantity: 0 },
    elite: { artifactFragmentQuantity: 10, artifactDropChance: 0, enchantmentShardQuantity: 1 },
    boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1, enchantmentShardQuantity: 4 },
  },
  5: {
    normal: { artifactFragmentQuantity: 5, artifactDropChance: 0, enchantmentShardQuantity: 0 },
    elite: { artifactFragmentQuantity: 12, artifactDropChance: 0, enchantmentShardQuantity: 1 },
    boss: { artifactFragmentQuantity: 34, artifactDropChance: 0.12, enchantmentShardQuantity: 5 },
  },
  6: {
    normal: { artifactFragmentQuantity: 6, artifactDropChance: 0, enchantmentShardQuantity: 0 },
    elite: { artifactFragmentQuantity: 14, artifactDropChance: 0, enchantmentShardQuantity: 2 },
    boss: { artifactFragmentQuantity: 40, artifactDropChance: 0.14, enchantmentShardQuantity: 6 },
  },
  7: {
    normal: { artifactFragmentQuantity: 7, artifactDropChance: 0, enchantmentShardQuantity: 1 },
    elite: { artifactFragmentQuantity: 16, artifactDropChance: 0, enchantmentShardQuantity: 2 },
    boss: { artifactFragmentQuantity: 46, artifactDropChance: 0.16, enchantmentShardQuantity: 6 },
  },
  8: {
    normal: { artifactFragmentQuantity: 8, artifactDropChance: 0, enchantmentShardQuantity: 1 },
    elite: { artifactFragmentQuantity: 18, artifactDropChance: 0, enchantmentShardQuantity: 3 },
    boss: { artifactFragmentQuantity: 52, artifactDropChance: 0.18, enchantmentShardQuantity: 7 },
  },
} as const;
