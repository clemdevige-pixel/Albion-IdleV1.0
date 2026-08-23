import { describe, expect, it } from "vitest";
import { getDungeonKeyItemId } from "./dungeonKeyContentCatalog.js";
import {
  DUNGEON_DEFINITIONS, FACTION_T4_COMBAT_PROFILE_ID, FACTION_T5_COMBAT_PROFILE_ID, FACTION_T6_COMBAT_PROFILE_ID, FACTION_T7_COMBAT_PROFILE_ID, FACTION_T8_COMBAT_PROFILE_ID,
  KEEPER_T4_DUNGEON, KEEPER_T4_DUNGEON_ID, KEEPER_T5_DUNGEON, KEEPER_T6_DUNGEON, KEEPER_T7_DUNGEON, KEEPER_T8_DUNGEON, resolveDungeonCombatProfile,
} from "./dungeonContentCatalog.js";

const EXPECTED_STRUCTURE = ["normal", "normal", "elite", "boss"];
const EXPECTED_FACTIONS = ["Keeper", "Heretic", "Undead", "Morgana"];
const PROFILE_BY_TIER = { 4: FACTION_T4_COMBAT_PROFILE_ID, 5: FACTION_T5_COMBAT_PROFILE_ID, 6: FACTION_T6_COMBAT_PROFILE_ID, 7: FACTION_T7_COMBAT_PROFILE_ID, 8: FACTION_T8_COMBAT_PROFILE_ID } as const;

describe("dungeonContentCatalog", () => {
  it("authors the four faction dungeons for each available tier", () => {
    for (const tier of [4, 5, 6, 7, 8] as const) {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      expect(dungeons.map(({ faction }) => faction)).toEqual(EXPECTED_FACTIONS);
      for (const dungeon of dungeons) {
        expect(dungeon.combatProfileId).toBe(PROFILE_BY_TIER[tier]);
        expect(dungeon.keyItemId).toBe(getDungeonKeyItemId(tier));
        expect(dungeon.encounters.map(({ kind }) => kind)).toEqual(EXPECTED_STRUCTURE);
      }
    }
    expect(new Set(DUNGEON_DEFINITIONS.map(({ id }) => id)).size).toBe(DUNGEON_DEFINITIONS.length);
    expect(new Set(DUNGEON_DEFINITIONS.map(({ lootTableId }) => lootTableId)).size).toBe(DUNGEON_DEFINITIONS.length);
  });

  it("resolves every authored faction step through the generic combat profile registry", () => {
    for (const dungeon of DUNGEON_DEFINITIONS) {
      const profiles = dungeon.encounters.map((encounter, encounterIndex) => resolveDungeonCombatProfile({ dungeonDefinitionId: dungeon.id, encounterIndex, monsterDefinitionId: encounter.monsterDefinitionId }));
      for (const profile of profiles) {
        expect(profile.hp).toBeGreaterThan(0); expect(profile.damage).toBeGreaterThan(0); expect(profile.armor).toBeGreaterThanOrEqual(0); expect(profile.magicResistance).toBeGreaterThanOrEqual(0);
      }
      expect(profiles.at(-1)?.hp).toBeGreaterThan(profiles[0]?.hp ?? 0);
      expect(profiles.at(-1)?.damage).toBeGreaterThan(profiles[0]?.damage ?? 0);
    }
  });

  it("scales each tier above the previous tier through its world-band profile", () => {
    const encounters = [KEEPER_T4_DUNGEON, KEEPER_T5_DUNGEON, KEEPER_T6_DUNGEON, KEEPER_T7_DUNGEON, KEEPER_T8_DUNGEON].map((dungeon) => {
      const encounter = dungeon.encounters[0];
      if (encounter === undefined) throw new Error("Expected Keeper dungeon opener");
      return resolveDungeonCombatProfile({ dungeonDefinitionId: dungeon.id, encounterIndex: 0, monsterDefinitionId: encounter.monsterDefinitionId });
    });
    for (let index = 1; index < encounters.length; index += 1) {
      expect(encounters[index]?.hp).toBeGreaterThan(encounters[index - 1]?.hp ?? 0);
      expect(encounters[index]?.damage).toBeGreaterThan(encounters[index - 1]?.damage ?? 0);
    }
  });

  it("rejects unknown ids, indices and mismatched authored monsters", () => {
    expect(() => resolveDungeonCombatProfile({ dungeonDefinitionId: "unknown", encounterIndex: 0, monsterDefinitionId: "monster_keeper_warrior" })).toThrow(/Unknown dungeon definition/);
    expect(() => resolveDungeonCombatProfile({ dungeonDefinitionId: KEEPER_T4_DUNGEON_ID, encounterIndex: 99, monsterDefinitionId: "monster_keeper_warrior" })).toThrow(/Invalid dungeon encounter index/);
    expect(() => resolveDungeonCombatProfile({ dungeonDefinitionId: KEEPER_T4_DUNGEON_ID, encounterIndex: 0, monsterDefinitionId: "wrong_monster" })).toThrow(/monster mismatch/);
  });

  it("keeps Keeper as a normal entry rather than a runtime special case", () => {
    expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T4_DUNGEON); expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T5_DUNGEON); expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T6_DUNGEON); expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T7_DUNGEON); expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T8_DUNGEON);
  });
});