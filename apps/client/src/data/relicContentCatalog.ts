import type { RelicDefinition } from "@game/gameplay";
import { MONSTER_IDS } from "./monsterContentCatalog.js";

export const DUNGEON_RELIC_ID = "relic_dungeon";
export const DUNGEON_RELIC_ITEM_ID = "item_relic_dungeon";
export const DUNGEON_RELIC_SOURCE_ZONE_ID = "zone_mountain_t4";
export const DUNGEON_RELIC_SOURCE_SEGMENT_INDEX = 9;
export const DUNGEON_RELIC_CHARGE_PER_FACTION = 50;

/**
 * One global Dungeon Relic gates the Dungeon discovery chain.
 * The source is contextual because the Ancient Keeper monster definition is
 * reused outside Frostpeak Mountain; only Blue Mountain S10 may grant it.
 */
export const DUNGEON_RELIC_DEFINITION: RelicDefinition = {
  id: DUNGEON_RELIC_ID,
  inventoryItemId: DUNGEON_RELIC_ITEM_ID,
  source: {
    monsterId: MONSTER_IDS.keeperAncient,
    contextId: DUNGEON_RELIC_SOURCE_ZONE_ID,
    segmentIndex: DUNGEON_RELIC_SOURCE_SEGMENT_INDEX,
  },
  chargeRequirements: [
    { factionId: "keeper", killCount: DUNGEON_RELIC_CHARGE_PER_FACTION },
    { factionId: "heretic", killCount: DUNGEON_RELIC_CHARGE_PER_FACTION },
    { factionId: "undead", killCount: DUNGEON_RELIC_CHARGE_PER_FACTION },
    { factionId: "morgana", killCount: DUNGEON_RELIC_CHARGE_PER_FACTION },
  ],
};

export const RELIC_DEFINITIONS: readonly RelicDefinition[] = [DUNGEON_RELIC_DEFINITION];

export function getRelicDefinitionByInventoryItemId(itemId: string): RelicDefinition | undefined {
  return RELIC_DEFINITIONS.find((definition) => definition.inventoryItemId === itemId);
}

export function isRelicInventoryItem(itemId: string): boolean {
  return getRelicDefinitionByInventoryItemId(itemId) !== undefined;
}
