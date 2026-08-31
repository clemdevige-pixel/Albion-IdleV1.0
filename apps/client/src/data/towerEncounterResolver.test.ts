import { describe, expect, it } from "vitest";
import {
  TOWER_DIFFICULTY_ZERO_COMBAT_MULTIPLIER,
  TOWER_REINFORCED_COMBAT_MULTIPLIERS,
  getTowerDepthDifficultyMultiplier,
} from "@game/data";
import { resolveDungeonCombatProfile } from "./dungeonContentCatalog.js";
import { applyTowerFactionCombatNormalization } from "./towerCombatNormalization.js";
import {
  resolveTowerDifficultyZeroEncounter,
  resolveTowerEncounter,
} from "./towerEncounterResolver.js";

describe("towerEncounterResolver", () => {
  it("reuses the matching Dungeon source for Tower floors", () => {
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
  });

  it("uses the calibrated Difficulty 0 profile for trial floors", () => {
    const tower = resolveTowerEncounter(21, "tower-encounter-seed");
    const zero = resolveTowerDifficultyZeroEncounter(5, "morgana", 0);

    expect(tower).toMatchObject({
      dungeonDefinitionId: "dungeon_morgana_t5",
      dungeonEncounterIndex: 0,
      floorDefinition: {
        floor: 21,
        block: { id: "tower_trial_05", tier: 5, factionId: "morgana" },
      },
    });
    expect(tower.combatProfile).toEqual(zero.combatProfile);
  });

  it("keeps Dungeon balance immutable while applying Tower Difficulty 0 calibration", () => {
    const zero = resolveTowerDifficultyZeroEncounter(6, "heretic", 0);
    const baseProfile = resolveDungeonCombatProfile({
      dungeonDefinitionId: zero.dungeonDefinitionId,
      encounterIndex: zero.dungeonEncounterIndex,
      monsterDefinitionId: zero.monsterDefinitionId,
    });
    const normalized = applyTowerFactionCombatNormalization(
      { factionId: "heretic", tier: 6 },
      baseProfile,
    );
    const multiplier = TOWER_DIFFICULTY_ZERO_COMBAT_MULTIPLIER.heretic[6];
    const expected = {
      hp: Math.max(1, Math.round(normalized.hp * multiplier)),
      damage: Math.max(1, Math.round(normalized.damage * multiplier)),
      attackSpeed: normalized.attackSpeed,
      armor: Math.max(0, Math.round(normalized.armor * multiplier)),
      magicResistance: Math.max(0, Math.round(normalized.magicResistance * multiplier)),
    };

    expect(zero.combatProfile).toEqual(expected);
    expect(resolveDungeonCombatProfile({
      dungeonDefinitionId: zero.dungeonDefinitionId,
      encounterIndex: zero.dungeonEncounterIndex,
      monsterDefinitionId: zero.monsterDefinitionId,
    })).toEqual(baseProfile);
  });

  it("applies reinforced role tuning before Difficulty 0 calibration", () => {
    const reinforced = resolveTowerDifficultyZeroEncounter(8, "keeper", 2);
    const baseProfile = resolveDungeonCombatProfile({
      dungeonDefinitionId: reinforced.dungeonDefinitionId,
      encounterIndex: reinforced.dungeonEncounterIndex,
      monsterDefinitionId: reinforced.monsterDefinitionId,
    });
    const normalized = applyTowerFactionCombatNormalization(
      { factionId: "keeper", tier: 8 },
      baseProfile,
    );
    const roleTuned = {
      hp: Math.round(normalized.hp * TOWER_REINFORCED_COMBAT_MULTIPLIERS.hp),
      damage: Math.round(normalized.damage * TOWER_REINFORCED_COMBAT_MULTIPLIERS.damage),
      attackSpeed: normalized.attackSpeed,
      armor: Math.round(normalized.armor * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense),
      magicResistance: Math.round(
        normalized.magicResistance * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense,
      ),
    };
    const multiplier = TOWER_DIFFICULTY_ZERO_COMBAT_MULTIPLIER.keeper[8];

    expect(reinforced.combatProfile).toEqual({
      hp: Math.max(1, Math.round(roleTuned.hp * multiplier)),
      damage: Math.max(1, Math.round(roleTuned.damage * multiplier)),
      attackSpeed: roleTuned.attackSpeed,
      armor: Math.max(0, Math.round(roleTuned.armor * multiplier)),
      magicResistance: Math.max(0, Math.round(roleTuned.magicResistance * multiplier)),
    });
  });

  it("uses Difficulty 0 unchanged through floor 25", () => {
    expect(getTowerDepthDifficultyMultiplier(1)).toBe(1);
    expect(getTowerDepthDifficultyMultiplier(25)).toBe(1);
  });

  it("applies only Endless depth scaling after floor 25", () => {
    expect(getTowerDepthDifficultyMultiplier(26)).toBeCloseTo(1.01);
    expect(getTowerDepthDifficultyMultiplier(30)).toBeCloseTo(1.01);
    expect(getTowerDepthDifficultyMultiplier(31)).toBeCloseTo(1.02);
    expect(getTowerDepthDifficultyMultiplier(50)).toBeCloseTo(1.05);
    expect(getTowerDepthDifficultyMultiplier(100)).toBeCloseTo(1.15);

    const result = resolveTowerEncounter(26, "tower-encounter-seed");
    const zero = resolveTowerDifficultyZeroEncounter(
      result.floorDefinition.block.tier,
      result.floorDefinition.block.factionId,
      result.floorDefinition.indexInBlock,
    );
    const multiplier = getTowerDepthDifficultyMultiplier(26);

    expect(result.combatProfile).toEqual({
      hp: Math.round(zero.combatProfile.hp * multiplier),
      damage: Math.round(zero.combatProfile.damage * multiplier),
      attackSpeed: zero.combatProfile.attackSpeed,
      armor: Math.round(zero.combatProfile.armor * multiplier),
      magicResistance: Math.round(zero.combatProfile.magicResistance * multiplier),
    });
  });
});
