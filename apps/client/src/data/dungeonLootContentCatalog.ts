import type { DungeonEncounterKind } from "@game/gameplay";
import {
  HERETIC_T4_LOOT_TABLE_ID, HERETIC_T5_LOOT_TABLE_ID, HERETIC_T6_LOOT_TABLE_ID, HERETIC_T7_LOOT_TABLE_ID,
  KEEPER_T4_LOOT_TABLE_ID, KEEPER_T5_LOOT_TABLE_ID, KEEPER_T6_LOOT_TABLE_ID, KEEPER_T7_LOOT_TABLE_ID,
  MORGANA_T4_LOOT_TABLE_ID, MORGANA_T5_LOOT_TABLE_ID, MORGANA_T6_LOOT_TABLE_ID, MORGANA_T7_LOOT_TABLE_ID,
  UNDEAD_T4_LOOT_TABLE_ID, UNDEAD_T5_LOOT_TABLE_ID, UNDEAD_T6_LOOT_TABLE_ID, UNDEAD_T7_LOOT_TABLE_ID,
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
  readonly encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>;
}

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

function createFactionLootDefinition(id: string, faction: string, itemSuffix: string, encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>): DungeonLootDefinition {
  return { id, faction, artifactFragmentItemId: `item_resource_artifact_fragment_${itemSuffix}`, artifactItemId: `item_resource_artifact_${itemSuffix}`, encounters };
}

export const KEEPER_T4_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T4_LOOT_TABLE_ID, "Keeper", "keeper", T4_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T4_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T4_LOOT_TABLE_ID, "Heretic", "heretic", T4_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T4_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T4_LOOT_TABLE_ID, "Undead", "undead", T4_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T4_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T4_LOOT_TABLE_ID, "Morgana", "morgana", T4_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T5_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T5_LOOT_TABLE_ID, "Keeper", "keeper", T5_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T5_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T5_LOOT_TABLE_ID, "Heretic", "heretic", T5_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T5_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T5_LOOT_TABLE_ID, "Undead", "undead", T5_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T5_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T5_LOOT_TABLE_ID, "Morgana", "morgana", T5_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T6_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T6_LOOT_TABLE_ID, "Keeper", "keeper", T6_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T6_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T6_LOOT_TABLE_ID, "Heretic", "heretic", T6_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T6_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T6_LOOT_TABLE_ID, "Undead", "undead", T6_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T6_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T6_LOOT_TABLE_ID, "Morgana", "morgana", T6_FACTION_ENCOUNTER_LOOT);
export const KEEPER_T7_DUNGEON_LOOT = createFactionLootDefinition(KEEPER_T7_LOOT_TABLE_ID, "Keeper", "keeper", T7_FACTION_ENCOUNTER_LOOT);
export const HERETIC_T7_DUNGEON_LOOT = createFactionLootDefinition(HERETIC_T7_LOOT_TABLE_ID, "Heretic", "heretic", T7_FACTION_ENCOUNTER_LOOT);
export const UNDEAD_T7_DUNGEON_LOOT = createFactionLootDefinition(UNDEAD_T7_LOOT_TABLE_ID, "Undead", "undead", T7_FACTION_ENCOUNTER_LOOT);
export const MORGANA_T7_DUNGEON_LOOT = createFactionLootDefinition(MORGANA_T7_LOOT_TABLE_ID, "Morgana", "morgana", T7_FACTION_ENCOUNTER_LOOT);

export const DUNGEON_LOOT_DEFINITIONS: Readonly<Record<string, DungeonLootDefinition>> = Object.fromEntries([
  KEEPER_T4_DUNGEON_LOOT, HERETIC_T4_DUNGEON_LOOT, UNDEAD_T4_DUNGEON_LOOT, MORGANA_T4_DUNGEON_LOOT,
  KEEPER_T5_DUNGEON_LOOT, HERETIC_T5_DUNGEON_LOOT, UNDEAD_T5_DUNGEON_LOOT, MORGANA_T5_DUNGEON_LOOT,
  KEEPER_T6_DUNGEON_LOOT, HERETIC_T6_DUNGEON_LOOT, UNDEAD_T6_DUNGEON_LOOT, MORGANA_T6_DUNGEON_LOOT,
  KEEPER_T7_DUNGEON_LOOT, HERETIC_T7_DUNGEON_LOOT, UNDEAD_T7_DUNGEON_LOOT, MORGANA_T7_DUNGEON_LOOT,
].map((definition) => [definition.id, definition]));

export function getDungeonLootDefinition(lootTableId: string): DungeonLootDefinition {
  const definition = DUNGEON_LOOT_DEFINITIONS[lootTableId];
  if (definition === undefined) throw new Error(`Unknown dungeon loot table: ${lootTableId}`);
  return definition;
}
