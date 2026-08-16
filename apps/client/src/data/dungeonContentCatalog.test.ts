import { describe, expect, it } from "vitest";
import {
  KEEPER_T4_DUNGEON,
  KEEPER_T4_DUNGEON_ID,
  resolveKeeperT4DungeonCombatProfile,
} from "./dungeonContentCatalog.js";

describe("dungeonContentCatalog", () => {
  it("authors the validated five-encounter T4 structure", () => {
    expect(KEEPER_T4_DUNGEON.id).toBe(KEEPER_T4_DUNGEON_ID);
    expect(KEEPER_T4_DUNGEON.keyItemId).toBe("item_resource_dungeon_key_keeper");
    expect(KEEPER_T4_DUNGEON.encounters.map(({ kind }) => kind)).toEqual([
      "normal",
      "normal",
      "elite",
      "normal",
      "boss",
    ]);
  });

  it("keeps every dungeon step above its Mountain S10-derived baseline", () => {
    const profiles = KEEPER_T4_DUNGEON.encounters.map((encounter, encounterIndex) =>
      resolveKeeperT4DungeonCombatProfile({
        dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
        encounterIndex,
        monsterDefinitionId: encounter.monsterDefinitionId,
      }),
    );

    for (const profile of profiles) {
      expect(profile.maxHealth).toBeGreaterThan(0);
      expect(profile.damage).toBeGreaterThan(0);
      expect(profile.armor).toBeGreaterThanOrEqual(0);
      expect(profile.magicResistance).toBeGreaterThanOrEqual(0);
    }

    expect(profiles.at(-1)?.maxHealth).toBeGreaterThan(profiles[0]?.maxHealth ?? 0);
    expect(profiles.at(-1)?.damage).toBeGreaterThan(profiles[0]?.damage ?? 0);
  });

  it("rejects unknown dungeon ids and encounter indices", () => {
    expect(() => resolveKeeperT4DungeonCombatProfile({
      dungeonDefinitionId: "unknown",
      encounterIndex: 0,
      monsterDefinitionId: "monster_keeper_warrior",
    })).toThrow(/Unsupported dungeon combat profile/);

    expect(() => resolveKeeperT4DungeonCombatProfile({
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      encounterIndex: 99,
      monsterDefinitionId: "monster_keeper_warrior",
    })).toThrow(/Invalid Keeper T4 dungeon encounter index/);
  });
});
