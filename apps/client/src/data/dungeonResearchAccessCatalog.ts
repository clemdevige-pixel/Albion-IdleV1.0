import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

/**
 * Dungeon discovery is one global Academy gate. Dungeon faction identity remains
 * authored content, but no longer owns separate permanent Research gates.
 */
export function getDungeonResearchUnlockId(): string {
  return RESEARCH_UNLOCK_IDS.dungeonSystem;
}

/** Localisation des Sanctuaires also authoritatively opens the rare Rune world channel. */
export function getFactionRuneWorldDropUnlockId(): string {
  return RESEARCH_UNLOCK_IDS.factionRuneWorldDrop;
}
