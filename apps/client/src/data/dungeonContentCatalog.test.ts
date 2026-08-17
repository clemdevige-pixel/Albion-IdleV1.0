import { describe, expect, it } from "vitest";
import { getDungeonKeyItemId } from "./dungeonKeyContentCatalog.js";
import {
  DUNGEON_DEFINITIONS,
  FACTION_T4_COMBAT_PROFILE_ID,
  FACTION_T5_COMBAT_PROFILE_ID,
  KEEPER_T4_DUNGEON,
  KEEPER_T4_DUNGEON_ID,
  KEEPER_T5_DUNGEON,
  resolveDungeonCombatProfile,
} from "./dungeonContentCatalog.js";

const EXPECTED_STRUCTURE = ["normal", "normal", "elite", "normal", "boss"];
const EXPECTED_FACTIONS = ["Keeper", "Heretic", "Undead", "Morgana"];

describe("dungeonContentCatalog", () => {
  it("authors the four faction dungeons for each available tier", () => {
    const t4 = DUNGEON_DEFINITIONS.filter(({ tier }) => tier === 4);
    const t5 = DUNGEON_DEFINITIONS.filter(({ tier }) => tier === 5);

    expect(t4.map(({ faction }) => faction)).toEqual(EXPECTED_FACTIONS);
    expect(t5.map(({ faction }) => faction)).toEqual(EXPECTED_FACTIONS);
    expect(new Set(DUNGEON_DEFINITIONS.map(({ id }) => id)).size).toBe(DUNGEON_DEFINITIONS.length);
    expect(new Set(DUNGEON_DEFINITIONS.map(({ lootTableId }) => lootTableId)).size).toBe(DUNGEON_DEFINITIONS.length);

    for (const dungeon of t4) {
      expect(dungeon.combatProfileId).toBe(FACTION_T4_COMBAT_PROFILE_ID);
      expect(dungeon.keyItemId).toBe(getDungeonKeyItemId(4));
      expect(dungeon.encounters.map(({ kind }) => kind)).toEqual(EXPECTED_STRUCTURE);
    }
    for (const dungeon of t5) {
      expect(dungeon.combatProfileId).toBe(FACTION_T5_COMBAT_PROFILE_ID);
      expect(dungeon.keyItemId).toBe(getDungeonKeyItemId(5));
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

  it("scales T5 above the matching T4 dungeon through the Yellow band profile", () => {
    const t4Encounter = KEEPER_T4_DUNGEON.encounters[0];
    const t5Encounter = KEEPER_T5_DUNGEON.encounters[0];
    if (t4Encounter === undefined || t5Encounter === undefined) throw new Error("Expected Keeper dungeon opener");

    const t4 = resolveDungeonCombatProfile({
      dungeonDefinitionId: KEEPER_T4_DUNGEON.id,
      encounterIndex: 0,
      monsterDefinitionId: t4Encounter.monsterDefinitionId,
    });
    const t5 = resolveDungeonCombatProfile({
      dungeonDefinitionId: KEEPER_T5_DUNGEON.id,
      encounterIndex: 0,
      monsterDefinitionId: t5Encounter.monsterDefinitionId,
    });

    expect(t5.hp).toBeGreaterThan(t4.hp);
    expect(t5.damage).toBeGreaterThan(t4.damage);
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
    expect(DUNGEON_DEFINITIONS).toContain(KEEPER_T5_DUNGEON);
  });
});
