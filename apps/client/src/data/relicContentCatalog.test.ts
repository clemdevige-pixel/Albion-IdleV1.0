import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import { RELIC_DEFINITIONS } from "./relicContentCatalog.js";

const EXPECTED = {
  keeper: MONSTER_IDS.keeperAncient,
  heretic: MONSTER_IDS.hereticMadmen,
  undead: MONSTER_IDS.undeadLich,
  morgana: MONSTER_IDS.morganaHighPriestess,
} as const;

describe("relicContentCatalog", () => {
  it("authors one boss-dropped 50-kill Relic for every supported faction", () => {
    expect(RELIC_DEFINITIONS).toHaveLength(4);
    for (const [factionId, bossMonsterId] of Object.entries(EXPECTED)) {
      expect(RELIC_DEFINITIONS.find((definition) => definition.factionId === factionId)).toEqual({
        id: `relic_${factionId}`,
        factionId,
        sourceBossMonsterId: bossMonsterId,
        chargeKillCount: 50,
      });
    }
  });
});
