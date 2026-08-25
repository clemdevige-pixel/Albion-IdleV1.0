import {
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
} from "@game/data";
import { getEnchantmentShardItemId, type DungeonEncounterKind } from "@game/gameplay";
import {
  HERETIC_T4_LOOT_TABLE_ID, HERETIC_T5_LOOT_TABLE_ID, HERETIC_T6_LOOT_TABLE_ID, HERETIC_T7_LOOT_TABLE_ID, HERETIC_T8_LOOT_TABLE_ID,
  KEEPER_T4_LOOT_TABLE_ID, KEEPER_T5_LOOT_TABLE_ID, KEEPER_T6_LOOT_TABLE_ID, KEEPER_T7_LOOT_TABLE_ID, KEEPER_T8_LOOT_TABLE_ID,
  MORGANA_T4_LOOT_TABLE_ID, MORGANA_T5_LOOT_TABLE_ID, MORGANA_T6_LOOT_TABLE_ID, MORGANA_T7_LOOT_TABLE_ID, MORGANA_T8_LOOT_TABLE_ID,
  UNDEAD_T4_LOOT_TABLE_ID, UNDEAD_T5_LOOT_TABLE_ID, UNDEAD_T6_LOOT_TABLE_ID, UNDEAD_T7_LOOT_TABLE_ID, UNDEAD_T8_LOOT_TABLE_ID,
} from "./dungeonContentCatalog.js";

export interface DungeonEncounterLootDefinition {
  readonly artifactFragmentQuantity: number;
  readonly artifactDropChance: number;
  readonly enchantmentShardQuantity: number;
}
export interface DungeonLootDefinition {
  readonly id: string;
  readonly faction: string;
  readonly artifactFragmentItemId: string;
  readonly artifactItemId: string;
  readonly enchantmentShardItemId: string;
  readonly completionSilver: number;
  readonly encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>;
}

export const DUNGEON_COMPLETION_SILVER_BY_TIER = {
  4: 2_500,
  5: 5_000,
  6: 10_000,
  7: 20_000,
  8: 40_000,
} as const;

/**
 * Dungeon shards are intentionally a collateral reward for faction/artifact farming,
 * not a replacement for open-world shard progression. Full-run totals are:
 * T4=5, T5=6, T6=8, T7=10, T8=12.
 */
const T4_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 4, artifactDropChance: 0, enchantmentShardQuantity: 0 },
  elite: { artifactFragmentQuantity: 10, artifactDropChance: 0, enchantmentShardQuantity: 1 },
  boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1, enchantmentShardQuantity: 4 },
};
const T5_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 5, artifactDropChance: 0, enchantmentShardQuantity: 0 },
  elite: { artifactFragmentQuantity: 12, artifactDropChance: 0, enchantmentShardQuantity: 1 },
  boss: { artifactFragmentQuantity: 34, artifactDropChance: 0.12, enchantmentShardQuantity: 5 },
};
const T6_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 6, artifactDropChance: 0, enchantmentShardQuantity: 0 },
  elite: { artifactFragmentQuantity: 14, artifactDropChance: 0, enchantmentShardQuantity: 2 },
  boss: { artifactFragmentQuantity: 40, artifactDropChance: 0.14, enchantmentShardQuantity: 6 },
};
const T7_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 7, artifactDropChance: 0, enchantmentShardQuantity: 1 },
  elite: { artifactFragmentQuantity: 16, artifactDropChance: 0, enchantmentShardQuantity: 2 },
  boss: { artifactFragmentQuantity: 46, artifactDropChance: 0.16, enchantmentShardQuantity: 6 },
};
const T8_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 8, artifactDropChance: 0, enchantmentShardQuantity: 1 },
  elite: { artifactFragmentQuantity: 18, artifactDropChance: 0, enchantmentShardQuantity: 3 },
  boss: { artifactFragmentQuantity: 52, artifactDropChance: 0.18, enchantmentShardQuantity: 7 },
};

function createFactionLootDefinition(
  id: string,
  faction: string,
  itemSuffix: string,
  tier: 4 | 5 | 6 | 7 | 8,
  completionSilver: number,
  encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>,
): DungeonLootDefinition {
  return {
    id,
    faction,
    artifactFragmentItemId: getDungeonArtifactFragmentItemId(itemSuffix, tier),
    artifactItemId: getDungeonArtifactItemId(itemSuffix, tier),
    enchantmentShardItemId: getEnchantmentShardItemId(tier),
    completionSilver,
    encounters,
  };
}

export const KEEPER_T4_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T4_LOOT_TABLE_ID, "Keeper", "keeper", 4, DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T4_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T4_LOOT_TABLE_ID, "Heretic", "heretic", 4, DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T4_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T4_LOOT_TABLE_ID, "Undead", "undead", 4, DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T4_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T4_LOOT_TABLE_ID, "Morgana", "morgana", 4, DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T5_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T5_LOOT_TABLE_ID, "Keeper", "keeper", 5, DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T5_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T5_LOOT_TABLE_ID, "Heretic", "heretic", 5, DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T5_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T5_LOOT_TABLE_ID, "Undead", "undead", 5, DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T5_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T5_LOOT_TABLE_ID, "Morgana", "morgana", 5, DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T6_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T6_LOOT_TABLE_ID, "Keeper", "keeper", 6, DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T6_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T6_LOOT_TABLE_ID, "Heretic", "heretic", 6, DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T6_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T6_LOOT_TABLE_ID, "Undead", "undead", 6, DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T6_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T6_LOOT_TABLE_ID, "Morgana", "morgana", 6, DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T7_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T7_LOOT_TABLE_ID, "Keeper", "keeper", 7, DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T7_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T7_LOOT_TABLE_ID, "Heretic", "heretic", 7, DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T7_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T7_LOOT_TABLE_ID, "Undead", "undead", 7, DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T7_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T7_LOOT_TABLE_ID, "Morgana", "morgana", 7, DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T8_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T8_LOOT_TABLE_ID, "Keeper", "keeper", 8, DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T8_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T8_LOOT_TABLE_ID, "Heretic", "heretic", 8, DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T8_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T8_LOOT_TABLE_ID, "Undead", "undead", 8, DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T8_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T8_LOOT_TABLE_ID, "Morgana", "morgana", 8, DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);

export const DUNGEON_LOOT_DEFINITIONS: Readonly<Record<string, DungeonLootDefinition>> = Object.fromEntries([
  KEEPER_T4_DUNGEON_LOOT, HERETIC_T4_DUNGEON_LOOT, UNDEAD_T4_DUNGEON_LOOT, MORGANA_T4_DUNGEON_LOOT,
  KEEPER_T5_DUNGEON_LOOT, HERETIC_T5_DUNGEON_LOOT, UNDEAD_T5_DUNGEON_LOOT, MORGANA_T5_DUNGEON_LOOT,
  KEEPER_T6_DUNGEON_LOOT, HERETIC_T6_DUNGEON_LOOT, UNDEAD_T6_DUNGEON_LOOT, MORGANA_T6_DUNGEON_LOOT,
  KEEPER_T7_DUNGEON_LOOT, HERETIC_T7_DUNGEON_LOOT, UNDEAD_T7_DUNGEON_LOOT, MORGANA_T7_DUNGEON_LOOT,
  KEEPER_T8_DUNGEON_LOOT, HERETIC_T8_DUNGEON_LOOT, UNDEAD_T8_DUNGEON_LOOT, MORGANA_T8_DUNGEON_LOOT,
].map((definition) => [definition.id, definition]));

export function getDungeonLootDefinition(lootTableId: string): DungeonLootDefinition {
  const definition = DUNGEON_LOOT_DEFINITIONS[lootTableId];
  if (definition === undefined) throw new Error(`Unknown dungeon loot table: ${lootTableId}`);
  return definition;
}
