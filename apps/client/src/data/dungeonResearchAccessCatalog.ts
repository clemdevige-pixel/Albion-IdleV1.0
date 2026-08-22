import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

const DUNGEON_FAMILY_UNLOCK_BY_FACTION: Readonly<Record<string, string>> = {
  keeper: RESEARCH_UNLOCK_IDS.keeperDungeonFamily,
};

/**
 * Returns the authored Research unlock required to enter a faction dungeon.
 * Families without an authored access Research remain governed by the existing
 * dungeon progression rules until their content is deliberately authored.
 */
export function getDungeonFamilyResearchUnlockId(factionId: string): string | undefined {
  return DUNGEON_FAMILY_UNLOCK_BY_FACTION[factionId.trim().toLowerCase()];
}
