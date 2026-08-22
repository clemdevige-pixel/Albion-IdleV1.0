import type { RelicDefinition } from "@game/gameplay";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

interface FactionRelicAuthoring {
  readonly factionId: string;
  readonly normalMonsterIds: readonly [string, string];
  readonly eliteMonsterId: string;
  readonly territoryZoneDefId: string;
}

const FACTION_RELIC_AUTHORING: readonly FactionRelicAuthoring[] = [
  {
    factionId: "keeper",
    normalMonsterIds: [MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman],
    eliteMonsterId: MONSTER_IDS.keeperChampion,
    territoryZoneDefId: WORLD_ZONE_CONTENT.mountain.id,
  },
  {
    factionId: "heretic",
    normalMonsterIds: [MONSTER_IDS.hereticThug, MONSTER_IDS.hereticFirestarter],
    eliteMonsterId: MONSTER_IDS.hereticEnforcer,
    territoryZoneDefId: WORLD_ZONE_CONTENT.highland.id,
  },
  {
    factionId: "undead",
    normalMonsterIds: [MONSTER_IDS.undeadSkeletonSwordsman, MONSTER_IDS.undeadSkeletonArcher],
    eliteMonsterId: MONSTER_IDS.undeadSpectralKnight,
    territoryZoneDefId: WORLD_ZONE_CONTENT.swamp.id,
  },
  {
    factionId: "morgana",
    normalMonsterIds: [MONSTER_IDS.morganaWitch, MONSTER_IDS.morganaSuppressor],
    eliteMonsterId: MONSTER_IDS.morganaDarkKnight,
    territoryZoneDefId: WORLD_ZONE_CONTENT.steppe.id,
  },
];

function createFactionRelic(authoring: FactionRelicAuthoring): RelicDefinition {
  const { factionId, normalMonsterIds, eliteMonsterId, territoryZoneDefId } = authoring;
  return {
    id: `relic_${factionId}`,
    factionId,
    objectives: [
      {
        id: `${factionId}_discovery`,
        requirement: {
          type: "all_monsters_killed",
          monsterIds: normalMonsterIds,
          minimumEach: 1,
        },
      },
      {
        id: `${factionId}_familiarization`,
        requirement: {
          type: "faction_kill_count",
          factionId,
          minimum: 25,
        },
      },
      {
        id: `${factionId}_deep_study`,
        requirement: {
          type: "faction_kill_count",
          factionId,
          minimum: 100,
        },
      },
      {
        id: `${factionId}_elite_study`,
        requirement: {
          type: "monster_kill_count",
          monsterId: eliteMonsterId,
          minimum: 3,
        },
      },
      {
        id: `${factionId}_territory_progression`,
        requirement: {
          type: "world_segment_progress",
          zoneDefId: territoryZoneDefId,
          minimumCompletedSegments: 5,
        },
      },
    ],
  };
}

/** Authored Relic data. Runtime evaluation remains faction-agnostic. */
export const RELIC_DEFINITIONS: readonly RelicDefinition[] = FACTION_RELIC_AUTHORING.map(createFactionRelic);
