import type { RelicDefinition } from "@game/gameplay";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

/**
 * Authored Relic content only. Runtime evaluation lives in @game/gameplay and
 * must remain faction-agnostic.
 */
export const RELIC_DEFINITIONS = [
  {
    id: "relic_keeper",
    factionId: "keeper",
    objectives: [
      {
        id: "keeper_discovery",
        requirement: {
          type: "all_monsters_killed",
          monsterIds: [MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman],
          minimumEach: 1,
        },
      },
      {
        id: "keeper_familiarization",
        requirement: {
          type: "faction_kill_count",
          factionId: "keeper",
          minimum: 25,
        },
      },
      {
        id: "keeper_deep_study",
        requirement: {
          type: "faction_kill_count",
          factionId: "keeper",
          minimum: 100,
        },
      },
      {
        id: "keeper_elite_study",
        requirement: {
          type: "monster_kill_count",
          monsterId: MONSTER_IDS.keeperChampion,
          minimum: 3,
        },
      },
      {
        id: "keeper_territory_progression",
        requirement: {
          type: "world_segment_progress",
          zoneDefId: WORLD_ZONE_CONTENT.mountain.id,
          minimumCompletedSegments: 5,
        },
      },
    ],
  },
] as const satisfies readonly RelicDefinition[];
