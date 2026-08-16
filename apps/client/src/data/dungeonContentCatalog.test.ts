import { describe, expect, it } from "vitest";
import {
  DUNGEON_DEFINITIONS,
  FACTION_T4_COMBAT_PROFILE_ID,
  KEEPER_T4_DUNGEON,
  KEEPER_T4_DUNGEON_ID,
  resolveDungeonCombatProfile,
} from "./dungeonContentCatalog.js";

const EXPECTED_STRUCTURE = ["normal", "normal", "elite", "normal", "boss"];

describe("dungeonContentCatalog", () => {
  it("authors the four T4 faction dungeons through shared combat profiles and dedicated loot tables", () => {
    expect(DUNGEON_DEFINITIONS.map(({ faction }) => faction)).toEqual([
      "Keeper",
      "Heretic",
      "Undead",
      "Morgana",
    ]);
    expect(new Set(DUNGEON_DEFINITIONS.map(({ id }) => id)).size).toBe(DUNGEON_DEFINITIONS.length);
    expect(new Set(DUNGEON_DEFINITIONS.map(({ lootTableId }) => lootTableId)).size).toBe(DUNGEON_DEFINITIONS.length);

    for (const dungeon of DUNGEON_DEFINITIONS) {
      expect(dungeon.tier).toBe(4);
      expect(dungeon.combatProfileId).toBe(FACTION_T4_COMBAT_PROFILE_ID);
      expect(dungeon.keyItemId).toBe(`item_resource_dungeon_key_${dungeon.faction.toLowerCase()}`);
      expect(dungeon.encounters.map(({ kind }) => kind)).toEqual(EXPECTED_STRUCTURE);
    }
  });

  it("resolves every authored faction step through the generic combat profile registry", () => {
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const profiles = dungeon.encounters.map((encounter, encounterIndex) =>
        resolveDungeonCombatProfile({
          dungeonDefinitionId: dungeon.id,
          encounterIndex,
          monsterDefinitionId: encounter.monsterDefinitionId,
        }),
      );

      for (const profile of profiles) {
        expect(profile.hp).toBeGreaterThan(0);
        expect(profile.damage).toBeGreaterThan(0);
        expect(profile.armor).toBeGreaterThanOrEqual(0);
        expect(profile.magicResistance).toBeGreaterThanOrEqual(0);
      }
      expect(profiles.at(-1)?.hp).toBeGreaterThan(profiles[0]?.hp ?? 0);
      expect(profiles.at(-1)?.damage).toBeGreaterThan(profiles[0]?.damage ?? 0);
    }
  });

  it("rejects unknown ids, indices and mismatched authored monsters", () => {
    expect(() => resolveDungeonCombatProfile({
      dungeonDefinitionId: "unknown",
      encounterIndex: 0,
      monsterDefinitionId: "monster_keeper_warrior",
    })).toThrow(/Unknown dungeon definition/);

    expect(() => resolveDungeonCombatProfile({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterIndex: 99,
      monsterDefinitionId: "monster_keeper_warrior",
    })).toThrow(/Invalid dungeon encounter index/);

    expect(() => resolveDungeonCombatProfile({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterIndex: 0,
      monsterDefinitionId: "wrong_monster",
    })).toThrow(/monster mismatch/);
  });

  it("keeps Keeper as a normal entry rather than a runtime special case", () => {
    expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T4_DUNGEON);
  });
});
