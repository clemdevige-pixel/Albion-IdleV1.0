import { RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

/**
 * Dungeon discovery is now one global Academy gate. Dungeon faction identity
 * remains authored content, but no longer owns separate permanent Research gates.
 */
export function getDungeonResearchUnlockId(): string {
  return RESEARCH_UNLOCK_IDS.dungeonSystem;
}
