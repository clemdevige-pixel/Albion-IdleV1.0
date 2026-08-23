import { describe, expect, it } from "vitest";
import type { DungeonDefinition } from "@game/gameplay";
import { RESEARCH_UNLOCK_IDS } from "../../data/researchContentCatalog.js";
import { createDungeonResearchAccessFoundation } from "./createDungeonResearchAccessFoundation.js";

const FACTIONS = ["Keeper", "Heretic", "Undead", "Morgana"] as const;

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
  it("gates dungeons and the rare Faction Rune world channel behind authored unlocks", () => {
    const completedUnlocks = new Set<string>();
    const dungeons = FACTIONS.map(createDungeon);
    const definitions = new Map(dungeons.map((definition) => [definition.id, definition] as const));
    const foundation = createDungeonResearchAccessFoundation({
      dungeonRuntime: { getDefinition: (definitionId) => definitions.get(definitionId) },
      researchService: { hasUnlock: (unlockId) => completedUnlocks.has(unlockId) },
    });

    expect(foundation.isDungeonSystemUnlocked()).toBe(false);
    expect(foundation.isFactionRuneWorldDropUnlocked()).toBe(false);
    for (const dungeon of dungeons) expect(foundation.canAccessDefinition(dungeon.id)).toBe(false);

    completedUnlocks.add(RESEARCH_UNLOCK_IDS.dungeonSystem);
    expect(foundation.isDungeonSystemUnlocked()).toBe(true);
    expect(foundation.isFactionRuneWorldDropUnlocked()).toBe(false);
    for (const dungeon of dungeons) expect(foundation.canAccessDefinition(dungeon.id)).toBe(true);

    completedUnlocks.add(RESEARCH_UNLOCK_IDS.factionRuneWorldDrop);
    expect(foundation.isFactionRuneWorldDropUnlocked()).toBe(true);
    expect(foundation.canAccessDefinition("unknown_dungeon")).toBe(false);
  });
});
