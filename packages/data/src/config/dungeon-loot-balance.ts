export type DungeonLootTier = 4 | 5 | 6 | 7 | 8;
export type DungeonLootEncounterKind = "normal" | "elite" | "boss";

export interface DungeonLootQuantityRange {
  readonly min: number;
  readonly max: number;
}

export interface DungeonEncounterLootBalance {
  readonly artifactFragmentRange: DungeonLootQuantityRange;
  readonly artifactDropChance: number;
  readonly enchantmentShardRange: DungeonLootQuantityRange;
  readonly factionRuneRange: DungeonLootQuantityRange;
}

/** Guaranteed on dungeon completion. Faction mastery may increase the deterministic amount. */
export const DUNGEON_COMPLETION_SILVER_BY_TIER: Readonly<Record<DungeonLootTier, number>> = {
  4: 10_000,
  5: 20_000,
  6: 35_000,
  7: 55_000,
  8: 80_000,
} as const;

const FRAGMENT_RANGES = {
  normal: { min: 1, max: 5 },
  elite: { min: 5, max: 12 },
  boss: { min: 15, max: 30 },
} as const;

/**
 * Dungeon material rewards use authored inclusive integer ranges.
 * Artifact fragment ranges are intentionally identical from T4 to T8 so a fixed
 * fragment craft cost does not become easier at higher tiers.
 */
export const DUNGEON_ENCOUNTER_LOOT_BY_TIER: Readonly<
  Record<DungeonLootTier, Readonly<Record<DungeonLootEncounterKind, DungeonEncounterLootBalance>>>
> = {
  4: {
    normal: { artifactFragmentRange: FRAGMENT_RANGES.normal, artifactDropChance: 0, enchantmentShardRange: { min: 0, max: 1 }, factionRuneRange: { min: 0, max: 0 } },
    elite: { artifactFragmentRange: FRAGMENT_RANGES.elite, artifactDropChance: 0, enchantmentShardRange: { min: 0, max: 2 }, factionRuneRange: { min: 0, max: 1 } },
    boss: { artifactFragmentRange: FRAGMENT_RANGES.boss, artifactDropChance: 0.10, enchantmentShardRange: { min: 2, max: 4 }, factionRuneRange: { min: 1, max: 3 } },
  },
  5: {
    normal: { artifactFragmentRange: FRAGMENT_RANGES.normal, artifactDropChance: 0, enchantmentShardRange: { min: 0, max: 1 }, factionRuneRange: { min: 0, max: 0 } },
    elite: { artifactFragmentRange: FRAGMENT_RANGES.elite, artifactDropChance: 0, enchantmentShardRange: { min: 1, max: 2 }, factionRuneRange: { min: 0, max: 1 } },
    boss: { artifactFragmentRange: FRAGMENT_RANGES.boss, artifactDropChance: 0.12, enchantmentShardRange: { min: 2, max: 5 }, factionRuneRange: { min: 2, max: 4 } },
  },
  6: {
    normal: { artifactFragmentRange: FRAGMENT_RANGES.normal, artifactDropChance: 0, enchantmentShardRange: { min: 0, max: 1 }, factionRuneRange: { min: 0, max: 0 } },
    elite: { artifactFragmentRange: FRAGMENT_RANGES.elite, artifactDropChance: 0, enchantmentShardRange: { min: 1, max: 3 }, factionRuneRange: { min: 0, max: 2 } },
    boss: { artifactFragmentRange: FRAGMENT_RANGES.boss, artifactDropChance: 0.14, enchantmentShardRange: { min: 3, max: 6 }, factionRuneRange: { min: 2, max: 5 } },
  },
  7: {
    normal: { artifactFragmentRange: FRAGMENT_RANGES.normal, artifactDropChance: 0, enchantmentShardRange: { min: 0, max: 2 }, factionRuneRange: { min: 0, max: 0 } },
    elite: { artifactFragmentRange: FRAGMENT_RANGES.elite, artifactDropChance: 0, enchantmentShardRange: { min: 1, max: 3 }, factionRuneRange: { min: 0, max: 2 } },
    boss: { artifactFragmentRange: FRAGMENT_RANGES.boss, artifactDropChance: 0.16, enchantmentShardRange: { min: 3, max: 7 }, factionRuneRange: { min: 3, max: 6 } },
  },
  8: {
    normal: { artifactFragmentRange: FRAGMENT_RANGES.normal, artifactDropChance: 0, enchantmentShardRange: { min: 0, max: 2 }, factionRuneRange: { min: 0, max: 0 } },
    elite: { artifactFragmentRange: FRAGMENT_RANGES.elite, artifactDropChance: 0, enchantmentShardRange: { min: 2, max: 4 }, factionRuneRange: { min: 0, max: 2 } },
    boss: { artifactFragmentRange: FRAGMENT_RANGES.boss, artifactDropChance: 0.18, enchantmentShardRange: { min: 4, max: 8 }, factionRuneRange: { min: 4, max: 7 } },
  },
} as const;
