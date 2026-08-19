import type { DungeonEncounterKind } from "@game/gameplay";
import {
  HERETIC_T4_LOOT_TABLE_ID, HERETIC_T5_LOOT_TABLE_ID, HERETIC_T6_LOOT_TABLE_ID, HERETIC_T7_LOOT_TABLE_ID, HERETIC_T8_LOOT_TABLE_ID,
  KEEPER_T4_LOOT_TABLE_ID, KEEPER_T5_LOOT_TABLE_ID, KEEPER_T6_LOOT_TABLE_ID, KEEPER_T7_LOOT_TABLE_ID, KEEPER_T8_LOOT_TABLE_ID,
  MORGANA_T4_LOOT_TABLE_ID, MORGANA_T5_LOOT_TABLE_ID, MORGANA_T6_LOOT_TABLE_ID, MORGANA_T7_LOOT_TABLE_ID, MORGANA_T8_LOOT_TABLE_ID,
  UNDEAD_T4_LOOT_TABLE_ID, UNDEAD_T5_LOOT_TABLE_ID, UNDEAD_T6_LOOT_TABLE_ID, UNDEAD_T7_LOOT_TABLE_ID, UNDEAD_T8_LOOT_TABLE_ID,
} from "./dungeonContentCatalog.js";

export interface DungeonEncounterLootDefinition {
  readonly artifactFragmentQuantity: number;
  readonly artifactDropChance: number;
}
export interface DungeonLootDefinition {
  readonly id: string;
  readonly faction: string;
  readonly artifactFragmentItemId: string;
  readonly artifactItemId: string;
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

const T4_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 4, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 10, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1 },
};
const T5_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 5, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 12, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 34, artifactDropChance: 0.12 },
};
const T6_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 6, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 14, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 40, artifactDropChance: 0.14 },
};
const T7_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 7, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 16, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 46, artifactDropChance: 0.16 },
};
const T8_FACTION_ENCOUNTER_LOOT: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>> = {
  normal: { artifactFragmentQuantity: 8, artifactDropChance: 0 }, elite: { artifactFragmentQuantity: 18, artifactDropChance: 0 }, boss: { artifactFragmentQuantity: 52, artifactDropChance: 0.18 },
};

function createFactionLootDefinition(
  id: string,
  faction: string,
  itemSuffix: string,
  completionSilver: number,
  encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>,
): DungeonLootDefinition {
  return {
    id,
    faction,
    artifactFragmentItemId: `item_resource_artifact_fragment_${itemSuffix}`,
    artifactItemId: `item_resource_artifact_${itemSuffix}`,
    completionSilver,
    encounters,
  };
}

export const KEEPER_T4_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T4_LOOT_TABLE_ID, "Keeper", "keeper", DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T4_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T4_LOOT_TABLE_ID, "Heretic", "heretic", DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T4_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T4_LOOT_TABLE_ID, "Undead", "undead", DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T4_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T4_LOOT_TABLE_ID, "Morgana", "morgana", DUNGEON_COMPLETION_SILVER_BY_TIER[4], T4_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T5_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T5_LOOT_TABLE_ID, "Keeper", "keeper", DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T5_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T5_LOOT_TABLE_ID, "Heretic", "heretic", DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T5_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T5_LOOT_TABLE_ID, "Undead", "undead", DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T5_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T5_LOOT_TABLE_ID, "Morgana", "morgana", DUNGEON_COMPLETION_SILVER_BY_TIER[5], T5_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T6_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T6_LOOT_TABLE_ID, "Keeper", "keeper", DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T6_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T6_LOOT_TABLE_ID, "Heretic", "heretic", DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T6_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T6_LOOT_TABLE_ID, "Undead", "undead", DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T6_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T6_LOOT_TABLE_ID, "Morgana", "morgana", DUNGEON_COMPLETION_SILVER_BY_TIER[6], T6_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T7_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T7_LOOT_TABLE_ID, "Keeper", "keeper", DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T7_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T7_LOOT_TABLE_ID, "Heretic", "heretic", DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T7_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T7_LOOT_TABLE_ID, "Undead", "undead", DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T7_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T7_LOOT_TABLE_ID, "Morgana", "morgana", DUNGEON_COMPLETION_SILVER_BY_TIER[7], T7_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T8_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T8_LOOT_TABLE_ID, "Keeper", "keeper", DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T8_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T8_LOOT_TABLE_ID, "Heretic", "heretic", DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T8_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T8_LOOT_TABLE_ID, "Undead", "undead", DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T8_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T8_LOOT_TABLE_ID, "Morgana", "morgana", DUNGEON_COMPLETION_SILVER_BY_TIER[8], T8_FACTION_ENCOUNTER_LOOT);

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
