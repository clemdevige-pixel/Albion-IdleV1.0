import {
  TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX,
  TOWER_REINFORCED_COMBAT_MULTIPLIERS,
} from "@game/data";
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

function applyTowerRoleCombatTuning(
  floorDefinition: TowerFloorDefinition,
  profile: AuthoredEnemyCombatProfile,
): AuthoredEnemyCombatProfile {
  if (floorDefinition.role !== "reinforced") return profile;

  return {
    hp: Math.round(profile.hp * TOWER_REINFORCED_COMBAT_MULTIPLIERS.hp),
    damage: Math.round(profile.damage * TOWER_REINFORCED_COMBAT_MULTIPLIERS.damage),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense),
    magicResistance: Math.round(
      profile.magicResistance * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense,
    ),
  };
}

/**
 * Resolves a Tower floor from existing faction Dungeon content.
 *
 * Tower owns sequencing and Tower-only role tuning. Faction rosters and base
 * combat stats stay authored by the Dungeon catalog so the Tower cannot drift
 * into a parallel monster/balance surface.
 */
export function resolveTowerEncounter(
  floor: number,
  towerSeed: string,
): ResolvedTowerEncounter {
  const floorDefinition = getTowerFloorDefinition(floor, towerSeed);
  const dungeonEncounterIndex = TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX[
    floorDefinition.indexInBlock
  ];
  if (dungeonEncounterIndex === undefined) {
    throw new Error(`Missing Tower encounter mapping for floor index ${String(floorDefinition.indexInBlock)}`);
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

  const baseCombatProfile = resolveDungeonCombatProfile({
    dungeonDefinitionId: dungeon.id,
    encounterIndex: dungeonEncounterIndex,
    monsterDefinitionId: encounter.monsterDefinitionId,
  });

  return {
    status: "resolved",
    floorDefinition,
    dungeonDefinitionId: dungeon.id,
    dungeonEncounterIndex,
    encounterId: encounter.id,
    encounterKind: encounter.kind,
    monsterDefinitionId: encounter.monsterDefinitionId,
    combatProfile: applyTowerRoleCombatTuning(floorDefinition, baseCombatProfile),
  };
}
