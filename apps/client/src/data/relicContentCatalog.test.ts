import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import { RELIC_DEFINITIONS } from "./relicContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

const EXPECTED = {
  keeper: {
    normals: [MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman],
    elite: MONSTER_IDS.keeperChampion,
    zoneDefId: WORLD_ZONE_CONTENT.mountain.id,
  },
  heretic: {
    normals: [MONSTER_IDS.hereticThug, MONSTER_IDS.hereticFirestarter],
    elite: MONSTER_IDS.hereticEnforcer,
    zoneDefId: WORLD_ZONE_CONTENT.highland.id,
  },
  undead: {
    normals: [MONSTER_IDS.undeadSkeletonSwordsman, MONSTER_IDS.undeadSkeletonArcher],
    elite: MONSTER_IDS.undeadSpectralKnight,
    zoneDefId: WORLD_ZONE_CONTENT.swamp.id,
  },
  morgana: {
    normals: [MONSTER_IDS.morganaWitch, MONSTER_IDS.morganaSuppressor],
    elite: MONSTER_IDS.morganaDarkKnight,
    zoneDefId: WORLD_ZONE_CONTENT.steppe.id,
  },
} as const;

describe("relicContentCatalog", () => {
  it("authors one five-objective Relic for every supported faction", () => {
    expect(RELIC_DEFINITIONS).toHaveLength(4);
    for (const [factionId, expected] of Object.entries(EXPECTED)) {
      const relic = RELIC_DEFINITIONS.find((definition) => definition.factionId === factionId);
      expect(relic?.id).toBe(`relic_${factionId}`);
      expect(relic?.objectives).toHaveLength(5);
      expect(relic?.objectives).toEqual([
        {
          id: `${factionId}_discovery`,
          requirement: { type: "all_monsters_killed", monsterIds: expected.normals, minimumEach: 1 },
        },
        {
          id: `${factionId}_familiarization`,
          requirement: { type: "faction_kill_count", factionId, minimum: 25 },
        },
        {
          id: `${factionId}_deep_study`,
          requirement: { type: "faction_kill_count", factionId, minimum: 100 },
        },
        {
          id: `${factionId}_elite_study`,
          requirement: { type: "monster_kill_count", monsterId: expected.elite, minimum: 3 },
        },
        {
          id: `${factionId}_territory_progression`,
          requirement: { type: "world_segment_progress", zoneDefId: expected.zoneDefId, minimumCompletedSegments: 5 },
        },
      ]);
    }
  });
});
