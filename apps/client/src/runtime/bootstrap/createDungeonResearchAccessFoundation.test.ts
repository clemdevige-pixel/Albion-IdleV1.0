import { describe, expect, it } from "vitest";
import type { DungeonDefinition } from "@game/gameplay";
import { RESEARCH_UNLOCK_IDS } from "../../data/researchContentCatalog.js";
import { createDungeonResearchAccessFoundation } from "./createDungeonResearchAccessFoundation.js";

const FACTION_UNLOCKS = [
  ["Keeper", RESEARCH_UNLOCK_IDS.keeperDungeonFamily],
  ["Heretic", RESEARCH_UNLOCK_IDS.hereticDungeonFamily],
  ["Undead", RESEARCH_UNLOCK_IDS.undeadDungeonFamily],
  ["Morgana", RESEARCH_UNLOCK_IDS.morganaDungeonFamily],
] as const;

function createDungeon(faction: string): DungeonDefinition {
  return {
    id: `dungeon_${faction.toLowerCase()}_test`,
    tier: 4,
    faction,
    keyItemId: "item_resource_dungeon_key_t4",
    combatProfileId: "combat_test",
    lootTableId: "loot_test",
    encounters: [],
  };
}

describe("createDungeonResearchAccessFoundation", () => {
  it("gates every authored faction family until its matching Research unlock is completed", () => {
    const completedUnlocks = new Set<string>();
    const dungeons = FACTION_UNLOCKS.map(([faction]) => createDungeon(faction));
    const definitions = new Map(dungeons.map((definition) => [definition.id, definition] as const));
    const foundation = createDungeonResearchAccessFoundation({
      dungeonRuntime: { getDefinition: (definitionId) => definitions.get(definitionId) },
      researchService: { hasUnlock: (unlockId) => completedUnlocks.has(unlockId) },
    });

    for (const [faction, unlockId] of FACTION_UNLOCKS) {
      const dungeonId = `dungeon_${faction.toLowerCase()}_test`;
      expect(foundation.canAccessDefinition(dungeonId)).toBe(false);
      completedUnlocks.add(unlockId);
      expect(foundation.canAccessDefinition(dungeonId)).toBe(true);
    }
  });
});
