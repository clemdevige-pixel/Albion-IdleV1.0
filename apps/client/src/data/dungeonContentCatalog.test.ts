import { describe, expect, it } from "vitest";
import {
  KEEPER_T4_DUNGEON,
  KEEPER_T4_DUNGEON_ID,
  KEEPER_T4_COMBAT_PROFILE_ID,
  KEEPER_T4_LOOT_TABLE_ID,
  resolveDungeonCombatProfile,
} from "./dungeonContentCatalog.js";

describe("dungeonContentCatalog", () => {
  it("authors dungeon content through combat and loot profile ids", () => {
    expect(KEEPER_T4_DUNGEON.id).toBe(KEEPER_T4_DUNGEON_ID);
    expect(KEEPER_T4_DUNGEON.combatProfileId).toBe(KEEPER_T4_COMBAT_PROFILE_ID);
    expect(KEEPER_T4_DUNGEON.lootTableId).toBe(KEEPER_T4_LOOT_TABLE_ID);
    expect(KEEPER_T4_DUNGEON.keyItemId).toBe("item_resource_dungeon_key_keeper");
    expect(KEEPER_T4_DUNGEON.encounters.map(({ kind }) => kind)).toEqual([
      "normal", "normal", "elite", "normal", "boss",
    ]);
  });

  it("resolves every authored step through the generic combat profile registry", () => {
    const profiles = KEEPER_T4_DUNGEON.encounters.map((encounter, encounterIndex) =>
      resolveDungeonCombatProfile({
        dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
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
});
