import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import { RELIC_DEFINITIONS } from "./relicContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

describe("relicContentCatalog", () => {
  it("authors the validated Keeper pilot exclusively as data", () => {
    expect(RELIC_DEFINITIONS).toHaveLength(1);
    const keeper = RELIC_DEFINITIONS[0];

    expect(keeper).toEqual({
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
          requirement: { type: "faction_kill_count", factionId: "keeper", minimum: 25 },
        },
        {
          id: "keeper_deep_study",
          requirement: { type: "faction_kill_count", factionId: "keeper", minimum: 100 },
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
    });
  });
});
