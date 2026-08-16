import type { DungeonEncounterKind } from "@game/gameplay";
import { KEEPER_T4_LOOT_TABLE_ID } from "./dungeonContentCatalog.js";

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

/** Provisional V1 economy values, isolated from runtime code. */
export const KEEPER_T4_DUNGEON_LOOT: DungeonLootDefinition = {
  id: KEEPER_T4_LOOT_TABLE_ID,
  faction: "Keeper",
  artifactFragmentItemId: "item_resource_artifact_fragment_keeper",
  artifactItemId: "item_resource_artifact_keeper",
  encounters: {
    normal: { artifactFragmentQuantity: 4, artifactDropChance: 0 },
    elite: { artifactFragmentQuantity: 10, artifactDropChance: 0 },
    boss: { artifactFragmentQuantity: 28, artifactDropChance: 0.1 },
  },
};

export const DUNGEON_LOOT_DEFINITIONS: Readonly<Record<string, DungeonLootDefinition>> = {
  [KEEPER_T4_DUNGEON_LOOT.id]: KEEPER_T4_DUNGEON_LOOT,
};

export function getDungeonLootDefinition(lootTableId: string): DungeonLootDefinition {
  const definition = DUNGEON_LOOT_DEFINITIONS[lootTableId];
  if (definition === undefined) throw new Error(`Unknown dungeon loot table: ${lootTableId}`);
  return definition;
}
