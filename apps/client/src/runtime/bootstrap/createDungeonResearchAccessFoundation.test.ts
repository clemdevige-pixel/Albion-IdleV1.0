import { describe, expect, it } from "vitest";
import type { DungeonDefinition } from "@game/gameplay";
import { RESEARCH_UNLOCK_IDS } from "../../data/researchContentCatalog.js";
import { createDungeonResearchAccessFoundation } from "./createDungeonResearchAccessFoundation.js";

const KEEPER_DUNGEON: DungeonDefinition = {
  id: "dungeon_keeper_test",
  tier: 4,
  faction: "Keeper",
  keyItemId: "item_resource_dungeon_key_t4",
  combatProfileId: "combat_test",
  lootTableId: "loot_test",
  encounters: [],
};

const HERETIC_DUNGEON: DungeonDefinition = {
  ...KEEPER_DUNGEON,
  id: "dungeon_heretic_test",
  faction: "Heretic",
};

describe("createDungeonResearchAccessFoundation", () => {
  it("gates an authored dungeon family until its Research unlock is completed", () => {
    const completedUnlocks = new Set<string>();
    const definitions = new Map<string, DungeonDefinition>([
      [KEEPER_DUNGEON.id, KEEPER_DUNGEON],
    ]);
    const foundation = createDungeonResearchAccessFoundation({
      dungeonRuntime: { getDefinition: (definitionId) => definitions.get(definitionId) },
      researchService: { hasUnlock: (unlockId) => completedUnlocks.has(unlockId) },
    });

    expect(foundation.canAccessDefinition(KEEPER_DUNGEON.id)).toBe(false);
    completedUnlocks.add(RESEARCH_UNLOCK_IDS.keeperDungeonFamily);
    expect(foundation.canAccessDefinition(KEEPER_DUNGEON.id)).toBe(true);
  });

  it("does not invent a gate for factions whose access Research is not authored yet", () => {
    const definitions = new Map<string, DungeonDefinition>([
      [HERETIC_DUNGEON.id, HERETIC_DUNGEON],
    ]);
    const foundation = createDungeonResearchAccessFoundation({
      dungeonRuntime: { getDefinition: (definitionId) => definitions.get(definitionId) },
      researchService: { hasUnlock: () => false },
    });

    expect(foundation.canAccessDefinition(HERETIC_DUNGEON.id)).toBe(true);
  });
});
