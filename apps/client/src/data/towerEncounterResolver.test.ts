import { describe, expect, it } from "vitest";
import {
  TOWER_REINFORCED_COMBAT_MULTIPLIERS,
  getTowerDepthDifficultyMultiplier,
} from "@game/data";
import { resolveDungeonCombatProfile } from "./dungeonContentCatalog.js";
import { applyTowerFactionCombatNormalization } from "./towerCombatNormalization.js";
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

  it("normalizes non-Keeper combat profiles only inside Tower resolution", () => {
    const tower = resolveTowerEncounter(6, "tower-encounter-seed");
    const baseProfile = resolveDungeonCombatProfile({
      dungeonDefinitionId: tower.dungeonDefinitionId,
      encounterIndex: tower.dungeonEncounterIndex,
      monsterDefinitionId: tower.monsterDefinitionId,
    });
    const expectedTowerProfile = applyTowerFactionCombatNormalization(
      { factionId: tower.floorDefinition.block.factionId, tier: tower.floorDefinition.block.tier },
      baseProfile,
    );

    expect(tower.floorDefinition).toMatchObject({
      floor: 6,
      role: "normal",
      block: { tier: 6, factionId: "heretic" },
    });
    expect(tower.combatProfile).toEqual(expectedTowerProfile);
    expect(tower.combatProfile).not.toEqual(baseProfile);
    expect(resolveDungeonCombatProfile({
      dungeonDefinitionId: tower.dungeonDefinitionId,
      encounterIndex: tower.dungeonEncounterIndex,
      monsterDefinitionId: tower.monsterDefinitionId,
    })).toEqual(baseProfile);
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

  it("uses the validated +1% per five-floor block depth curve after floor 25", () => {
    expect(getTowerDepthDifficultyMultiplier(25)).toBe(1);
    expect(getTowerDepthDifficultyMultiplier(26)).toBeCloseTo(1.01);
    expect(getTowerDepthDifficultyMultiplier(30)).toBeCloseTo(1.01);
    expect(getTowerDepthDifficultyMultiplier(31)).toBeCloseTo(1.02);
    expect(getTowerDepthDifficultyMultiplier(50)).toBeCloseTo(1.05);
    expect(getTowerDepthDifficultyMultiplier(100)).toBeCloseTo(1.15);
  });

  it("applies faction normalization before the endless depth multiplier", () => {
    const result = resolveTowerEncounter(26, "tower-encounter-seed");
    const baseProfile = resolveDungeonCombatProfile({
      dungeonDefinitionId: result.dungeonDefinitionId,
      encounterIndex: result.dungeonEncounterIndex,
      monsterDefinitionId: result.monsterDefinitionId,
    });
    const normalizedProfile = applyTowerFactionCombatNormalization(
      { factionId: result.floorDefinition.block.factionId, tier: result.floorDefinition.block.tier },
      baseProfile,
    );
    const multiplier = getTowerDepthDifficultyMultiplier(26);

    expect(result.dungeonDefinitionId).toBe(
      `dungeon_${result.floorDefinition.block.factionId}_t${String(result.floorDefinition.block.tier)}`,
    );
    expect(result.dungeonEncounterIndex).toBe(0);
    expect(result.encounterKind).toBe("normal");
    expect(result.combatProfile).toEqual({
      hp: Math.round(normalizedProfile.hp * multiplier),
      damage: Math.round(normalizedProfile.damage * multiplier),
      attackSpeed: normalizedProfile.attackSpeed,
      armor: Math.round(normalizedProfile.armor * multiplier),
      magicResistance: Math.round(normalizedProfile.magicResistance * multiplier),
    });
  });
});
