import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

const DUNGEON_FAMILY_UNLOCK_BY_FACTION: Readonly<Record<string, string>> = {
  keeper: RESEARCH_UNLOCK_IDS.keeperDungeonFamily,
  heretic: RESEARCH_UNLOCK_IDS.hereticDungeonFamily,
  undead: RESEARCH_UNLOCK_IDS.undeadDungeonFamily,
  morgana: RESEARCH_UNLOCK_IDS.morganaDungeonFamily,
};

/** Returns the authored Research unlock required to enter a faction dungeon. */
export function getDungeonFamilyResearchUnlockId(factionId: string): string | undefined {
  return DUNGEON_FAMILY_UNLOCK_BY_FACTION[factionId.trim().toLowerCase()];
}
