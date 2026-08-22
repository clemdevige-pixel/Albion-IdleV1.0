import { describe, expect, it } from "vitest";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import {
  getRelicDefinitionByInventoryItemId,
  isRelicInventoryItem,
  RELIC_DEFINITIONS,
} from "./relicContentCatalog.js";

const EXPECTED = {
  keeper: MONSTER_IDS.keeperAncient,
  heretic: MONSTER_IDS.hereticMadmen,
  undead: MONSTER_IDS.undeadLich,
  morgana: MONSTER_IDS.morganaHighPriestess,
} as const;

describe("relicContentCatalog", () => {
  it("authors one boss-dropped 50-kill Relic and unique inventory item per faction", () => {
    expect(RELIC_DEFINITIONS).toHaveLength(4);
    for (const [factionId, bossMonsterId] of Object.entries(EXPECTED)) {
      const inventoryItemId = `item_relic_${factionId}`;
      expect(RELIC_DEFINITIONS.find((definition) => definition.factionId === factionId)).toEqual({
        id: `relic_${factionId}`,
        factionId,
        sourceBossMonsterId: bossMonsterId,
        inventoryItemId,
        chargeKillCount: 50,
      });
      expect(getRelicDefinitionByInventoryItemId(inventoryItemId)?.factionId).toBe(factionId);
      expect(isRelicInventoryItem(inventoryItemId)).toBe(true);
    }
    expect(isRelicInventoryItem("item_resource_wood_t3")).toBe(false);
  });
});
