import {
  DUNGEON_COMPLETION_SILVER_BY_TIER,
  DUNGEON_ENCOUNTER_LOOT_BY_TIER,
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
  getFactionRuneItemId,
  type DungeonEncounterLootBalance,
  type DungeonLootTier,
} from "@game/data";
import { getEnchantmentShardItemId, type DungeonEncounterKind } from "@game/gameplay";
import {
  HERETIC_T4_LOOT_TABLE_ID, HERETIC_T5_LOOT_TABLE_ID, HERETIC_T6_LOOT_TABLE_ID, HERETIC_T7_LOOT_TABLE_ID, HERETIC_T8_LOOT_TABLE_ID,
  KEEPER_T4_LOOT_TABLE_ID, KEEPER_T5_LOOT_TABLE_ID, KEEPER_T6_LOOT_TABLE_ID, KEEPER_T7_LOOT_TABLE_ID, KEEPER_T8_LOOT_TABLE_ID,
  MORGANA_T4_LOOT_TABLE_ID, MORGANA_T5_LOOT_TABLE_ID, MORGANA_T6_LOOT_TABLE_ID, MORGANA_T7_LOOT_TABLE_ID, MORGANA_T8_LOOT_TABLE_ID,
  UNDEAD_T4_LOOT_TABLE_ID, UNDEAD_T5_LOOT_TABLE_ID, UNDEAD_T6_LOOT_TABLE_ID, UNDEAD_T7_LOOT_TABLE_ID, UNDEAD_T8_LOOT_TABLE_ID,
} from "./dungeonContentCatalog.js";

export type DungeonEncounterLootDefinition = DungeonEncounterLootBalance;

export interface DungeonLootDefinition {
  readonly id: string;
  readonly faction: string;
  readonly tier: DungeonLootTier;
  readonly artifactFragmentItemId: string;
  readonly artifactItemId: string;
  readonly enchantmentShardItemId: string;
  readonly factionRuneItemId: string;
  readonly completionSilver: number;
  readonly encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>;
}

export { DUNGEON_COMPLETION_SILVER_BY_TIER } from "@game/data";

function createFactionLootDefinition(
  id: string,
  faction: string,
  itemSuffix: string,
  tier: DungeonLootTier,
): DungeonLootDefinition {
  return {
    id,
    faction,
    tier,
    artifactFragmentItemId: getDungeonArtifactFragmentItemId(itemSuffix, tier),
    artifactItemId: getDungeonArtifactItemId(itemSuffix, tier),
    enchantmentShardItemId: getEnchantmentShardItemId(tier),
    factionRuneItemId: getFactionRuneItemId(tier),
    completionSilver: DUNGEON_COMPLETION_SILVER_BY_TIER[tier],
    encounters: DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier],
  };
}

export const KEEPER_T4_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T4_LOOT_TABLE_ID, "Keeper", "keeper", 4);
export const HERETIC_T4_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T4_LOOT_TABLE_ID, "Heretic", "heretic", 4);
export const UNDEAD_T4_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T4_LOOT_TABLE_ID, "Undead", "undead", 4);
export const MORGANA_T4_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T4_LOOT_TABLE_ID, "Morgana", "morgana", 4);
export const KEEPER_T5_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T5_LOOT_TABLE_ID, "Keeper", "keeper", 5);
export const HERETIC_T5_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T5_LOOT_TABLE_ID, "Heretic", "heretic", 5);
export const UNDEAD_T5_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T5_LOOT_TABLE_ID, "Undead", "undead", 5);
export const MORGANA_T5_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T5_LOOT_TABLE_ID, "Morgana", "morgana", 5);
export const KEEPER_T6_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T6_LOOT_TABLE_ID, "Keeper", "keeper", 6);
export const HERETIC_T6_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T6_LOOT_TABLE_ID, "Heretic", "heretic", 6);
export const UNDEAD_T6_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T6_LOOT_TABLE_ID, "Undead", "undead", 6);
export const MORGANA_T6_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T6_LOOT_TABLE_ID, "Morgana", "morgana", 6);
export const KEEPER_T7_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T7_LOOT_TABLE_ID, "Keeper", "keeper", 7);
export const HERETIC_T7_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T7_LOOT_TABLE_ID, "Heretic", "heretic", 7);
export const UNDEAD_T7_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T7_LOOT_TABLE_ID, "Undead", "undead", 7);
export const MORGANA_T7_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T7_LOOT_TABLE_ID, "Morgana", "morgana", 7);
export const KEEPER_T8_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T8_LOOT_TABLE_ID, "Keeper", "keeper", 8);
export const HERETIC_T8_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T8_LOOT_TABLE_ID, "Heretic", "heretic", 8);
export const UNDEAD_T8_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T8_LOOT_TABLE_ID, "Undead", "undead", 8);
export const MORGANA_T8_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T8_LOOT_TABLE_ID, "Morgana", "morgana", 8);

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
