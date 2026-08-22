import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import {
  DUNGEON_RELIC_CHARGE_PER_FACTION,
  DUNGEON_RELIC_DEFINITION,
  DUNGEON_RELIC_ID,
  DUNGEON_RELIC_ITEM_ID,
  DUNGEON_RELIC_SOURCE_SEGMENT_INDEX,
  DUNGEON_RELIC_SOURCE_ZONE_ID,
  getRelicDefinitionByInventoryItemId,
  isRelicInventoryItem,
  RELIC_DEFINITIONS,
} from "./relicContentCatalog.js";

const EXPECTED_FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

describe("relicContentCatalog", () => {
  it("authors the single global Dungeon Relic dropped only by Mountain Blue S10", () => {
    expect(RELIC_DEFINITIONS).toEqual([DUNGEON_RELIC_DEFINITION]);
    expect(DUNGEON_RELIC_DEFINITION).toEqual({
      id: DUNGEON_RELIC_ID,
      inventoryItemId: DUNGEON_RELIC_ITEM_ID,
      source: {
        monsterId: MONSTER_IDS.keeperAncient,
        contextId: DUNGEON_RELIC_SOURCE_ZONE_ID,
        segmentIndex: DUNGEON_RELIC_SOURCE_SEGMENT_INDEX,
      },
      chargeRequirements: EXPECTED_FACTIONS.map((factionId) => ({
        factionId,
        killCount: DUNGEON_RELIC_CHARGE_PER_FACTION,
      })),
    });
  });

  it("resolves only the global Dungeon Relic inventory item", () => {
    expect(getRelicDefinitionByInventoryItemId(DUNGEON_RELIC_ITEM_ID)).toEqual(DUNGEON_RELIC_DEFINITION);
    expect(isRelicInventoryItem(DUNGEON_RELIC_ITEM_ID)).toBe(true);
    expect(isRelicInventoryItem("item_relic_keeper")).toBe(false);
    expect(isRelicInventoryItem("item_resource_wood_t3")).toBe(false);
  });
});
