import type { RelicDefinition } from "@game/gameplay";
import { MONSTER_IDS } from "./monsterContentCatalog.js";

interface FactionRelicAuthoring {
  readonly factionId: string;
  readonly sourceBossMonsterId: string;
}

const RELIC_CHARGE_KILL_COUNT = 50;

const FACTION_RELIC_AUTHORING: readonly FactionRelicAuthoring[] = [
  { factionId: "keeper", sourceBossMonsterId: MONSTER_IDS.keeperAncient },
  { factionId: "heretic", sourceBossMonsterId: MONSTER_IDS.hereticMadmen },
  { factionId: "undead", sourceBossMonsterId: MONSTER_IDS.undeadLich },
  { factionId: "morgana", sourceBossMonsterId: MONSTER_IDS.morganaHighPriestess },
];

function createFactionRelic(authoring: FactionRelicAuthoring): RelicDefinition {
  return {
    id: `relic_${authoring.factionId}`,
    factionId: authoring.factionId,
    sourceBossMonsterId: authoring.sourceBossMonsterId,
    inventoryItemId: `item_relic_${authoring.factionId}`,
    chargeKillCount: RELIC_CHARGE_KILL_COUNT,
  };
}

/** Authored Relic data. Runtime acquisition/charge remains faction-agnostic. */
export const RELIC_DEFINITIONS: readonly RelicDefinition[] = FACTION_RELIC_AUTHORING.map(createFactionRelic);

export function getRelicDefinitionByInventoryItemId(itemId: string): RelicDefinition | undefined {
  return RELIC_DEFINITIONS.find((definition) => definition.inventoryItemId === itemId);
}

export function isRelicInventoryItem(itemId: string): boolean {
  return getRelicDefinitionByInventoryItemId(itemId) !== undefined;
}
