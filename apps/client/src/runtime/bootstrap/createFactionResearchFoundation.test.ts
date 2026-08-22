import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "../../data/monsterContentCatalog.js";
import {
  DUNGEON_RELIC_ID,
  DUNGEON_RELIC_ITEM_ID,
  DUNGEON_RELIC_SOURCE_SEGMENT_INDEX,
  DUNGEON_RELIC_SOURCE_ZONE_ID,
} from "../../data/relicContentCatalog.js";
import { createFactionResearchFoundation } from "./createFactionResearchFoundation.js";

describe("createFactionResearchFoundation", () => {
  it("derives faction knowledge from the existing monster catalog", () => {
    const foundation = createFactionResearchFoundation();

    foundation.recordMonsterKill({ monsterId: MONSTER_IDS.keeperWarrior });
    foundation.recordMonsterKill({ monsterId: MONSTER_IDS.keeperChampion });

    expect(foundation.factionKnowledgeService.getMonsterKillCount(MONSTER_IDS.keeperWarrior)).toBe(1);
    expect(foundation.factionKnowledgeService.getFactionKillCount("keeper")).toBe(2);
    expect(foundation.factionKnowledgeService.getFactionEliteKillCount("keeper")).toBe(1);
  });

  it("grants the Dungeon Relic only from Mountain Blue S10", () => {
    const inventoryItems = new Set<string>();
    const foundation = createFactionResearchFoundation();
    foundation.bindRelicInventory({
      hasItem: (definition) => inventoryItems.has(definition.inventoryItemId),
      grantItem: (definition) => {
        inventoryItems.add(definition.inventoryItemId);
        return true;
      },
    });

    foundation.recordMonsterKill({
      monsterId: MONSTER_IDS.keeperAncient,
      contextId: "zone_forest_t3",
      segmentIndex: 9,
    });
    expect(inventoryItems.has(DUNGEON_RELIC_ITEM_ID)).toBe(false);

    foundation.recordMonsterKill({
      monsterId: MONSTER_IDS.keeperAncient,
      contextId: DUNGEON_RELIC_SOURCE_ZONE_ID,
      segmentIndex: DUNGEON_RELIC_SOURCE_SEGMENT_INDEX,
    });
    expect(inventoryItems.has(DUNGEON_RELIC_ITEM_ID)).toBe(true);
    expect(foundation.relicService.getProgress(DUNGEON_RELIC_ID)).toMatchObject({
      state: "broken",
      chargeKills: 0,
      requiredChargeKills: 200,
    });
  });

  it("charges the Dungeon Relic through 50 new kills of every faction", () => {
    const foundation = createFactionResearchFoundation();
    foundation.recordMonsterKill({
      monsterId: MONSTER_IDS.keeperAncient,
      contextId: DUNGEON_RELIC_SOURCE_ZONE_ID,
      segmentIndex: DUNGEON_RELIC_SOURCE_SEGMENT_INDEX,
    });

    const chargeMonsters = [
      MONSTER_IDS.keeperWarrior,
      MONSTER_IDS.hereticThug,
      MONSTER_IDS.undeadSkeletonSwordsman,
      MONSTER_IDS.morganaWitch,
    ] as const;
    for (const monsterId of chargeMonsters) {
      for (let index = 0; index < 50; index += 1) {
        foundation.recordMonsterKill({ monsterId });
      }
    }

    expect(foundation.relicService.getProgress(DUNGEON_RELIC_ID)).toMatchObject({
      state: "charged",
      chargeKills: 200,
      requiredChargeKills: 200,
    });
  });
});
