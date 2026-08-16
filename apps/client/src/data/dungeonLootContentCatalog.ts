import type { DungeonEncounterKind } from "@game/gameplay";
import {
  HERETIC_T4_LOOT_TABLE_ID,
  KEEPER_T4_LOOT_TABLE_ID,
  MORGANA_T4_LOOT_TABLE_ID,
  UNDEAD_T4_LOOT_TABLE_ID,
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
  normal: { artifactFragmentQuantity: 4, artifactDropChance: 0 },
  elite: { artifactFragmentQuantity: 10, artifactDropChance: 0 },
  boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1 },
};

function createT4FactionLootDefinition(
  id: string,
  faction: string,
  itemSuffix: string,
): DungeonLootDefinition {
  return {
    id,
    faction,
    artifactFragmentItemId: `item_resource_artifact_fragment_${itemSuffix}`,
    artifactItemId: `item_resource_artifact_${itemSuffix}`,
    encounters: T4_FACTION_ENCOUNTER_LOOT,
  };
}

/** Provisional V1 economy values, isolated from runtime code. */
export const KEEPER_T4_DUNGEON_LOOT = createT4FactionLootDefinition(
  KEEPER_T4_LOOT_TABLE_ID,
  "Keeper",
  "keeper",
);

export const HERETIC_T4_DUNGEON_LOOT = createT4FactionLootDefinition(
  HERETIC_T4_LOOT_TABLE_ID,
  "Heretic",
  "heretic",
);

export const UNDEAD_T4_DUNGEON_LOOT = createT4FactionLootDefinition(
  UNDEAD_T4_LOOT_TABLE_ID,
  "Undead",
  "undead",
);

export const MORGANA_T4_DUNGEON_LOOT = createT4FactionLootDefinition(
  MORGANA_T4_LOOT_TABLE_ID,
  "Morgana",
  "morgana",
);

export const DUNGEON_LOOT_DEFINITIONS: Readonly<Record<string, DungeonLootDefinition>> = Object.fromEntries(
  [
    KEEPER_T4_DUNGEON_LOOT,
    HERETIC_T4_DUNGEON_LOOT,
    UNDEAD_T4_DUNGEON_LOOT,
    MORGANA_T4_DUNGEON_LOOT,
  ].map((definition) => [definition.id, definition]),
);

export function getDungeonLootDefinition(lootTableId: string): DungeonLootDefinition {
  const definition = DUNGEON_LOOT_DEFINITIONS[lootTableId];
  if (definition === undefined) throw new Error(`Unknown dungeon loot table: ${lootTableId}`);
  return definition;
}
