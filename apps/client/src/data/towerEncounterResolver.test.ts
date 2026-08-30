import { describe, expect, it } from "vitest";
import { TOWER_REINFORCED_COMBAT_MULTIPLIERS } from "@game/data";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";

describe("towerEncounterResolver", () => {
  it("reuses the matching T8 Keeper Dungeon normals for Tower floors 1 and 2", () => {
    const first = resolveTowerEncounter(1, "tower-encounter-seed");
    const second = resolveTowerEncounter(2, "tower-encounter-seed");

    expect(first).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 0,
      encounterKind: "normal",
      floorDefinition: { floor: 1, role: "normal", block: { tier: 8, factionId: "keeper" } },
    });
    expect(second).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 1,
      encounterKind: "normal",
    });
    expect(first.combatProfile.hp).toBeGreaterThan(0);
    expect(first.combatProfile.damage).toBeGreaterThan(0);
  });

  it("reuses normal 2 for reinforced floors and applies Tower-only authored multipliers", () => {
    const normal = resolveTowerEncounter(2, "tower-encounter-seed");
    const reinforced = resolveTowerEncounter(3, "tower-encounter-seed");

    expect(reinforced).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 1,
      encounterKind: "normal",
      monsterDefinitionId: normal.monsterDefinitionId,
      floorDefinition: { floor: 3, role: "reinforced" },
    });
    expect(reinforced.combatProfile).toEqual({
      hp: Math.round(normal.combatProfile.hp * TOWER_REINFORCED_COMBAT_MULTIPLIERS.hp),
      damage: Math.round(normal.combatProfile.damage * TOWER_REINFORCED_COMBAT_MULTIPLIERS.damage),
      attackSpeed: normal.combatProfile.attackSpeed,
      armor: Math.round(normal.combatProfile.armor * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense),
      magicResistance: Math.round(
        normal.combatProfile.magicResistance * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense,
      ),
    });
  });

  it("reuses the matching Dungeon elite and boss for floors 4 and 5", () => {
    expect(resolveTowerEncounter(4, "tower-encounter-seed")).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 2,
      encounterKind: "elite",
    });
    expect(resolveTowerEncounter(5, "tower-encounter-seed")).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_keeper_t8",
      dungeonEncounterIndex: 3,
      encounterKind: "boss",
    });
  });

  it("uses the authored faction and tier of later trial blocks", () => {
    expect(resolveTowerEncounter(21, "tower-encounter-seed")).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_morgana_t5",
      dungeonEncounterIndex: 0,
      floorDefinition: { block: { tier: 5, factionId: "morgana" } },
    });
  });

  it("resolves endless floors through the same Dungeon catalog", () => {
    const result = resolveTowerEncounter(26, "tower-encounter-seed");
    expect(result.dungeonDefinitionId).toBe(
      `dungeon_${result.floorDefinition.block.factionId}_t${String(result.floorDefinition.block.tier)}`,
    );
    expect(result.dungeonEncounterIndex).toBe(0);
    expect(result.encounterKind).toBe("normal");
  });
});
