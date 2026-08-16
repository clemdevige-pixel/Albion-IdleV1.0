import type { DungeonEncounterKind } from "@game/gameplay";

export interface DungeonEncounterLootDefinition {
  readonly artifactFragmentQuantity: number;
  readonly artifactDropChance: number;
}

export interface DungeonLootDefinition {
  readonly dungeonDefinitionId: string;
  readonly faction: string;
  readonly artifactFragmentItemId: string;
  readonly artifactItemId: string;
  readonly encounters: Readonly<Record<DungeonEncounterKind, DungeonEncounterLootDefinition>>;
}

/**
 * Provisional V1 economy values. Runtime behavior is stable; these numbers are
 * intentionally isolated here so balance can be benchmarked without touching
 * dungeon/combat code.
 */
export const KEEPER_T4_DUNGEON_LOOT: DungeonLootDefinition = {
  dungeonDefinitionId: "dungeon_keeper_t4",
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
  [KEEPER_T4_DUNGEON_LOOT.dungeonDefinitionId]: KEEPER_T4_DUNGEON_LOOT,
};

export function getDungeonLootDefinition(dungeonDefinitionId: string): DungeonLootDefinition {
  const definition = DUNGEON_LOOT_DEFINITIONS[dungeonDefinitionId];
  if (definition === undefined) throw new Error(`Unknown dungeon loot definition: ${dungeonDefinitionId}`);
  return definition;
}
