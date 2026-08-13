import { describe, expect, it } from "vitest";
import { MONSTER_LOOT_TABLES } from "./economyContentCatalog";
import { MONSTER_ABILITIES } from "./monsterAbilityContentCatalog";
import { MONSTER_DEFINITIONS, MONSTER_IDS, ZONE_ENCOUNTER_POOLS } from "./monsterContentCatalog";
import { renderManifestRegistry } from "../game/render/defaultRenderManifestRegistry";

const MORGANA_IDS = [
  MONSTER_IDS.morganaWitch,
  MONSTER_IDS.morganaSuppressor,
  MONSTER_IDS.morganaDarkKnight,
  MONSTER_IDS.morganaHighPriestess,
] as const;

describe("Morgana family content contract", () => {
  it("defines the complete Morgana family with one faction authority", () => {
    const monsters = MORGANA_IDS.map((id) => MONSTER_DEFINITIONS[id]);
    expect(monsters.every((monster) => monster?.faction === "Morgana")).toBe(true);
    expect(monsters.map((monster) => monster?.category)).toEqual(["normal", "normal", "elite", "boss"]);
  });

  it("resolves every Morgana ability, loot table and renderer manifest", () => {
    for (const id of MORGANA_IDS) {
      const monster = MONSTER_DEFINITIONS[id];
      expect(monster).toBeDefined();
      if (monster === undefined) continue;
      expect(MONSTER_LOOT_TABLES[monster.rewards.lootTableId]).toBeDefined();
      expect(renderManifestRegistry.getStaticActor(monster.visualManifestId)).toBeDefined();
      for (const abilityId of monster.abilityIds) expect(MONSTER_ABILITIES[abilityId]).toBeDefined();
    }
  });

  it("uses Morgana as Golden Steppe's dominant faction", () => {
    const pool = ZONE_ENCOUNTER_POOLS.zone_steppe_t4;
    expect(pool?.dominant.normal).toEqual([MONSTER_IDS.morganaWitch, MONSTER_IDS.morganaSuppressor]);
    expect(pool?.dominant.elite).toBe(MONSTER_IDS.morganaDarkKnight);
    expect(pool?.biomeBoss).toBe(MONSTER_IDS.morganaHighPriestess);
  });

  it("keeps Morgana Witch a normal caster instead of the old generic physical profile", () => {
    const witch = MONSTER_DEFINITIONS[MONSTER_IDS.morganaWitch];
    expect(witch?.category).toBe("normal");
    expect(witch?.combat.damageType).toBe("magical");
    expect(witch?.abilityIds).toEqual(["monster_ability_morgana_witch_shadow_bolt"]);
  });
});
