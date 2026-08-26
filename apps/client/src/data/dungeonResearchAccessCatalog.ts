import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

/**
 * Dungeon discovery is one global Academy gate completed by Analyse de la Relique.
 * Dungeon faction identity remains authored content, but no longer owns separate
 * permanent Research gates.
 */
export function getDungeonResearchUnlockId(): string {
  return RESEARCH_UNLOCK_IDS.dungeonSystem;
}

/** Analyse de la Relique also authoritatively opens the rare Rune world channel. */
export function getFactionRuneWorldDropUnlockId(): string {
  return RESEARCH_UNLOCK_IDS.factionRuneWorldDrop;
}
