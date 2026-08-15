import { describe, expect, it } from "vitest";
import { MONSTER_ABILITIES } from "./monsterAbilityContentCatalog";
import { MONSTER_DEFINITIONS, MONSTER_IDS, ZONE_ENCOUNTER_POOLS } from "./monsterContentCatalog";
import { renderManifestRegistry } from "../game/render/defaultRenderManifestRegistry";

const KEEPER_IDS = [
  MONSTER_IDS.keeperWarrior,
  MONSTER_IDS.keeperShaman,
  MONSTER_IDS.keeperChampion,
  MONSTER_IDS.keeperAncient,
] as const;

describe("Keeper family content contract", () => {
  it("defines the complete Keeper family with one faction authority", () => {
    const monsters = KEEPER_IDS.map((id) => MONSTER_DEFINITIONS[id]);
    expect(monsters.every((monster) => monster?.faction === "Keeper")).toBe(true);
    expect(monsters.map((monster) => monster?.category)).toEqual(["normal", "normal", "elite", "boss"]);
  });

  it("resolves every Keeper ability and renderer manifest", () => {
    for (const id of KEEPER_IDS) {
      const monster = MONSTER_DEFINITIONS[id];
      expect(monster).toBeDefined();
      if (monster === undefined) continue;
      expect(renderManifestRegistry.getStaticActor(monster.visualManifestId)).toBeDefined();
      for (const abilityId of monster.abilityIds) expect(MONSTER_ABILITIES[abilityId]).toBeDefined();
    }
  });

  it("uses Keeper as Mountain T4's dominant faction", () => {
    const pool = ZONE_ENCOUNTER_POOLS.zone_mountain_t4;
    expect(pool?.dominant.normal).toEqual([MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman]);
    expect(pool?.dominant.elite).toBe(MONSTER_IDS.keeperChampion);
    expect(pool?.biomeBoss).toBe(MONSTER_IDS.keeperAncient);
  });

  it("keeps the Keeper combat roles coherent", () => {
    expect(MONSTER_DEFINITIONS[MONSTER_IDS.keeperWarrior]?.combat.damageType).toBe("physical");
    expect(MONSTER_DEFINITIONS[MONSTER_IDS.keeperShaman]?.combat.damageType).toBe("magical");
    expect(MONSTER_DEFINITIONS[MONSTER_IDS.keeperChampion]?.category).toBe("elite");
    expect(MONSTER_DEFINITIONS[MONSTER_IDS.keeperAncient]?.category).toBe("boss");
  });
});
