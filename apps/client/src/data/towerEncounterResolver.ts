import { TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX } from "@game/data";
import { getTowerFloorDefinition, type TowerFloorDefinition } from "@game/gameplay";
import {
  DUNGEON_DEFINITIONS,
  resolveDungeonCombatProfile,
} from "./dungeonContentCatalog.js";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export interface ResolvedTowerEncounter {
  readonly status: "resolved";
  readonly floorDefinition: TowerFloorDefinition;
  readonly dungeonDefinitionId: string;
  readonly dungeonEncounterIndex: number;
  readonly encounterId: string;
  readonly encounterKind: "normal" | "elite" | "boss";
  readonly monsterDefinitionId: string;
  readonly combatProfile: AuthoredEnemyCombatProfile;
}

export interface UnresolvedTowerEncounter {
  readonly status: "unresolved";
  readonly floorDefinition: TowerFloorDefinition;
  readonly reason: "reinforced_encounter_not_authored";
}

export type TowerEncounterResolution = ResolvedTowerEncounter | UnresolvedTowerEncounter;

/**
 * Resolves a Tower floor from existing faction Dungeon content.
 *
 * Tower owns sequencing only. Faction rosters and combat stats stay authored
 * by the Dungeon catalog so the Tower cannot drift into a parallel balance
 * surface. Reinforced floors remain explicitly unresolved until their authored
 * source is defined in Tower data.
 */
export function resolveTowerEncounter(
  floor: number,
  towerSeed: string,
): TowerEncounterResolution {
  const floorDefinition = getTowerFloorDefinition(floor, towerSeed);
  const dungeonEncounterIndex = TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX[
    floorDefinition.indexInBlock
  ];

  if (dungeonEncounterIndex === null || dungeonEncounterIndex === undefined) {
    return {
      status: "unresolved",
      floorDefinition,
      reason: "reinforced_encounter_not_authored",
    };
  }

  const dungeon = DUNGEON_DEFINITIONS.find((definition) => (
    definition.tier === floorDefinition.block.tier
    && definition.faction.toLowerCase() === floorDefinition.block.factionId
  ));
  if (dungeon === undefined) {
    throw new Error(
      `Missing faction Dungeon for Tower ${floorDefinition.block.factionId} T${String(floorDefinition.block.tier)}`,
    );
  }

  const encounter = dungeon.encounters[dungeonEncounterIndex];
  if (encounter === undefined) {
    throw new Error(
      `Missing Dungeon encounter ${String(dungeonEncounterIndex)} for Tower source ${dungeon.id}`,
    );
  }

  return {
    status: "resolved",
    floorDefinition,
    dungeonDefinitionId: dungeon.id,
    dungeonEncounterIndex,
    encounterId: encounter.id,
    encounterKind: encounter.kind,
    monsterDefinitionId: encounter.monsterDefinitionId,
    combatProfile: resolveDungeonCombatProfile({
      dungeonDefinitionId: dungeon.id,
      encounterIndex: dungeonEncounterIndex,
      monsterDefinitionId: encounter.monsterDefinitionId,
    }),
  };
}
