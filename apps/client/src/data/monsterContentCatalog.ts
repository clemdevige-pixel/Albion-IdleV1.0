import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import type { ZoneDefinitionId } from "@game/gameplay";

export type MonsterCategory = "normal" | "veteran" | "elite" | "boss";

export interface MonsterCombatModifiers {
  readonly health: number;
  readonly damage: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly attackSpeed: number;
}

export interface MonsterRewardDefinition {
  /** Applied on top of the progression reward calculated from zone/segment/encounter. */
  readonly silverMultiplier: number;
  /** Applied on top of the progression reward calculated from zone/segment/encounter. */
  readonly fameMultiplier: number;
  readonly lootTableId: string;
}

export interface MonsterContentDefinition {
  readonly id: string;
  readonly name: string;
  readonly faction: string;
  readonly category: MonsterCategory;
  readonly tier: 3 | 4;
  readonly visualManifestId: string;
  readonly combat: MonsterCombatModifiers;
  readonly rewards: MonsterRewardDefinition;
  readonly tags: readonly string[];
}

export interface ZoneEncounterPool {
  readonly normal: readonly string[];
  readonly segmentBoss: string;
  readonly biomeBoss: string;
}

const DEFAULT_COMBAT: MonsterCombatModifiers = {
  health: 1,
  damage: 1,
  armor: 1,
  magicResistance: 1,
  attackSpeed: 0.8,
};

const DEFAULT_REWARDS: MonsterRewardDefinition = {
  silverMultiplier: 1,
  fameMultiplier: 1,
  lootTableId: "loot_monster_generic",
};

export const MONSTER_IDS = {
  stonefangWolf: "monster_stonefang_wolf",
  razorwingHarpy: "monster_razorwing_harpy",
  morganaWitch: "monster_morgana_witch",
  undeadWarrior: "monster_undead_warrior",
  ancientRuneGolem: "boss_ancient_rune_golem",
} as const;

export const MONSTER_DEFINITIONS: Readonly<Record<string, MonsterContentDefinition>> = {
  [MONSTER_IDS.stonefangWolf]: {
    id: MONSTER_IDS.stonefangWolf,
    name: "Stonefang Wolf",
    faction: "Animal",
    category: "normal",
    tier: 3,
    visualManifestId: "monster_stonefang_wolf",
    combat: DEFAULT_COMBAT,
    rewards: DEFAULT_REWARDS,
    tags: ["beast", "roaming"],
  },
  [MONSTER_IDS.razorwingHarpy]: {
    id: MONSTER_IDS.razorwingHarpy,
    name: "Razorwing Harpy",
    faction: "Keeper",
    category: "normal",
    tier: 3,
    visualManifestId: "monster_razorwing_harpy",
    combat: DEFAULT_COMBAT,
    rewards: DEFAULT_REWARDS,
    tags: ["harpy", "roaming"],
  },
  [MONSTER_IDS.morganaWitch]: {
    id: MONSTER_IDS.morganaWitch,
    name: "Morgana Witch",
    faction: "Morgana",
    category: "normal",
    tier: 3,
    visualManifestId: "monster_morgana_witch",
    combat: DEFAULT_COMBAT,
    rewards: DEFAULT_REWARDS,
    tags: ["caster", "roaming"],
  },
  [MONSTER_IDS.undeadWarrior]: {
    id: MONSTER_IDS.undeadWarrior,
    name: "Undead Warrior",
    faction: "Undead",
    category: "boss",
    tier: 3,
    visualManifestId: "monster_undead_warrior",
    combat: DEFAULT_COMBAT,
    rewards: {
      ...DEFAULT_REWARDS,
      lootTableId: "loot_monster_undead_boss",
    },
    tags: ["undead", "segment_boss"],
  },
  [MONSTER_IDS.ancientRuneGolem]: {
    id: MONSTER_IDS.ancientRuneGolem,
    name: "Ancient Rune Golem",
    faction: "Keeper",
    category: "boss",
    tier: 4,
    visualManifestId: "boss_ancient_rune_golem",
    combat: DEFAULT_COMBAT,
    rewards: {
      ...DEFAULT_REWARDS,
      lootTableId: "loot_monster_keeper_boss",
    },
    tags: ["golem", "biome_boss"],
  },
};

const CURRENT_NORMAL_POOL = [
  MONSTER_IDS.stonefangWolf,
  MONSTER_IDS.razorwingHarpy,
  MONSTER_IDS.morganaWitch,
] as const;

export const ZONE_ENCOUNTER_POOLS: Readonly<Record<string, ZoneEncounterPool>> = {
  zone_forest_t3: {
    normal: CURRENT_NORMAL_POOL,
    segmentBoss: MONSTER_IDS.undeadWarrior,
    biomeBoss: MONSTER_IDS.ancientRuneGolem,
  },
  zone_swamp_t3: {
    normal: CURRENT_NORMAL_POOL,
    segmentBoss: MONSTER_IDS.undeadWarrior,
    biomeBoss: MONSTER_IDS.ancientRuneGolem,
  },
  zone_highland_t3: {
    normal: CURRENT_NORMAL_POOL,
    segmentBoss: MONSTER_IDS.undeadWarrior,
    biomeBoss: MONSTER_IDS.ancientRuneGolem,
  },
  zone_steppe_t4: {
    normal: CURRENT_NORMAL_POOL,
    segmentBoss: MONSTER_IDS.undeadWarrior,
    biomeBoss: MONSTER_IDS.ancientRuneGolem,
  },
  zone_mountain_t4: {
    normal: CURRENT_NORMAL_POOL,
    segmentBoss: MONSTER_IDS.undeadWarrior,
    biomeBoss: MONSTER_IDS.ancientRuneGolem,
  },
};

export function getMonsterDefinition(id: string): MonsterContentDefinition {
  const definition = MONSTER_DEFINITIONS[id];
  if (definition === undefined) {
    throw new Error(`Unknown monster definition: ${id}`);
  }
  return definition;
}

export function getZoneEncounterPool(zoneDefId: ZoneDefinitionId): ZoneEncounterPool {
  const pool = ZONE_ENCOUNTER_POOLS[String(zoneDefId)];
  if (pool === undefined) {
    throw new Error(`Missing monster encounter pool for zone: ${String(zoneDefId)}`);
  }
  return pool;
}

export function resolveMonsterForEncounter(
  zoneDefId: ZoneDefinitionId,
  segmentIndex: number,
  encounterIndex: number,
  random: () => number = Math.random,
): MonsterContentDefinition {
  const pool = getZoneEncounterPool(zoneDefId);
  const isBoss = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
  const isBiomeBoss = isBoss && segmentIndex === SEGMENTS_PER_ZONE - 1;

  if (isBiomeBoss) return getMonsterDefinition(pool.biomeBoss);
  if (isBoss) return getMonsterDefinition(pool.segmentBoss);

  const index = Math.min(
    pool.normal.length - 1,
    Math.floor(Math.max(0, random()) * pool.normal.length),
  );
  const monsterId = pool.normal[index] ?? pool.normal[0];
  if (monsterId === undefined) {
    throw new Error(`Zone has no normal monsters: ${String(zoneDefId)}`);
  }
  return getMonsterDefinition(monsterId);
}
