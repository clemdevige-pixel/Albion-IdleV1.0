import { describe, expect, it } from "vitest";
import {
  TOWER_REINFORCED_COMBAT_MULTIPLIERS,
  TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS,
  getTowerDepthDifficultyMultiplier,
} from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS, resolveDungeonCombatProfile } from "./dungeonContentCatalog.js";
import { resolveFactionCapeDungeonDamageReductionPercent } from "./factionCapeContentCatalog.js";
import { applyTowerFactionCombatNormalization } from "./towerCombatNormalization.js";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TOWER_TRIAL_BLOCK_START_FLOORS = [1, 6, 11, 16, 21] as const;
const TOWER_BENCHMARK_SEED = "tower-runtime-benchmark";
const TOWER_BASE_WEAPON_ENCHANTMENT = 4 as const;
const TOWER_BASE_EQUIPMENT_ENCHANTMENT = 3 as const;
// Tower has no activity-specific potion cap. This fixture guarantees stock only;
// actual use remains governed by the shared CombatRuntime threshold/cooldown rules.
const TOWER_BENCHMARK_POTION_STOCK = 99;

const round1 = (value: number): number => Number(value.toFixed(1));

function resolveTowerTrialBlock(startFloor: number) {
  const encounters = Array.from({ length: 5 }, (_, offset) => (
    resolveTowerEncounter(startFloor + offset, TOWER_BENCHMARK_SEED)
  ));
  const first = encounters[0];
  if (first === undefined) {
    throw new Error(`Missing Tower trial block at floor ${String(startFloor)}`);
  }

  const blockId = first.floorDefinition.block.id;
  if (!encounters.every((encounter) => encounter.floorDefinition.block.id === blockId)) {
    throw new Error(`Tower benchmark block ${blockId} crosses authored block boundaries`);
  }

  const dungeon = DUNGEON_DEFINITIONS.find((definition) => definition.id === first.dungeonDefinitionId);
  if (dungeon === undefined) {
    throw new Error(`Missing Dungeon source ${first.dungeonDefinitionId} for Tower block ${blockId}`);
  }

  return {
    block: first.floorDefinition.block,
    dungeon,
    authoredEncounters: encounters.map((encounter) => ({
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: encounter.combatProfile,
    })),
  };
}

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

  it("applies the authored T5 Morgana trial calibration without changing defenses", () => {
    const tower = resolveTowerEncounter(21, "tower-encounter-seed");
    const baseProfile = resolveDungeonCombatProfile({
      dungeonDefinitionId: tower.dungeonDefinitionId,
      encounterIndex: tower.dungeonEncounterIndex,
      monsterDefinitionId: tower.monsterDefinitionId,
    });
    const normalizedProfile = applyTowerFactionCombatNormalization(
      { factionId: tower.floorDefinition.block.factionId, tier: tower.floorDefinition.block.tier },
      baseProfile,
    );
    const multipliers = TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS[tower.floorDefinition.block.id];

    expect(tower).toMatchObject({
      status: "resolved",
      dungeonDefinitionId: "dungeon_morgana_t5",
      dungeonEncounterIndex: 0,
      floorDefinition: {
        floor: 21,
        block: { id: "tower_trial_05", tier: 5, factionId: "morgana" },
      },
    });
    expect(multipliers).toEqual({ hp: 0.77, damage: 0.91 });
    expect(multipliers).toBeDefined();
    if (multipliers === undefined) return;
    expect(tower.combatProfile).toEqual({
      hp: Math.round(normalizedProfile.hp * multipliers.hp),
      damage: Math.round(normalizedProfile.damage * multipliers.damage),
      attackSpeed: normalizedProfile.attackSpeed,
      armor: normalizedProfile.armor,
      magicResistance: normalizedProfile.magicResistance,
    });
  });

  it("benchmarks favorable artifact weapons against the authored Tower trial blocks", () => {
    const blocks = TOWER_TRIAL_BLOCK_START_FLOORS.map((startFloor) => ({
      startFloor,
      ...resolveTowerTrialBlock(startFloor),
    }));

    const rows = blocks.flatMap(({ startFloor, block, dungeon, authoredEncounters }) => {
      const { tier, factionId } = block;
      const mastery = artifactBenchmarkMasteryProfile(tier);
      const capeItemId = `item_cape_t${String(tier)}_${factionId}`;
      const incomingDamageReductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
        capeItemId,
        { factionId, tier },
      );

      return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => {
        const weaponItemId = weapon.itemId(tier);
        const bonusPct = resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction);
        if (bonusPct <= 0) return [];

        const result = runCombatRuntimeBenchmark({
          label: `tower_${block.id}_${weapon.family}_${weapon.label}`,
          weaponItemId,
          equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, factionId),
          zoneDefId: WORLD_ZONE_IDS.mountain,
          segmentIndex: 9,
          authoredEncounters,
          enchantment: TOWER_BASE_WEAPON_ENCHANTMENT,
          equipmentEnchantment: TOWER_BASE_EQUIPMENT_ENCHANTMENT,
          familyMasteryLevel: mastery.familyMasteryLevel,
          specializationMasteryLevel: mastery.specializationMasteryLevel,
          siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
          useHealthPotions: true,
          healthPotionQuantity: TOWER_BENCHMARK_POTION_STOCK,
          heroDamageMultiplier: 1 + bonusPct / 100,
          incomingDamageReductionPercent,
        });
        const failedEncounter = result.encounters.find((encounter) => !encounter.cleared);

        return [{
          blockId: block.id,
          startFloor,
          endFloor: startFloor + 4,
          tier,
          faction: factionId,
          family: weapon.family,
          weapon: weapon.label,
          bonusPct,
          clear: result.clear,
          hpPct: round1(result.hpPercent),
          seconds: round1(result.seconds),
          potions: result.potionsUsed,
          encounterReached: result.encounterReached,
          failedFloor: failedEncounter === undefined
            ? null
            : startFloor + failedEncounter.encounterIndex - 1,
          failedFloorProgressPct: failedEncounter === undefined
            ? 100
            : round1(failedEncounter.encounterProgressPercent),
          enemyHpRemainingPct: round1(result.enemyHpRemainingPercent),
        }];
      });
    });

    const summary = blocks.map(({ startFloor, block }) => {
      const blockRows = rows.filter((row) => row.blockId === block.id);
      const clears = blockRows.filter((row) => row.clear);
      return {
        block: block.id,
        floors: `${String(startFloor)}-${String(startFloor + 4)}`,
        tier: block.tier,
        faction: block.factionId,
        favorableWeapons: blockRows.length,
        clears: `${String(clears.length)}/${String(blockRows.length)}`,
        minClearHpPct: clears.length === 0 ? null : Math.min(...clears.map((row) => row.hpPct)),
        maxClearHpPct: clears.length === 0 ? null : Math.max(...clears.map((row) => row.hpPct)),
        maxPotionsUsed: blockRows.length === 0 ? null : Math.max(...blockRows.map((row) => row.potions)),
      };
    });

    console.log("[TOWER_LIVE_TRIAL_REFERENCE]", {
      seed: TOWER_BENCHMARK_SEED,
      weaponEnchantment: TOWER_BASE_WEAPON_ENCHANTMENT,
      equipmentEnchantment: TOWER_BASE_EQUIPMENT_ENCHANTMENT,
      awakenedWeapon: "none",
      potionStock: TOWER_BENCHMARK_POTION_STOCK,
      potionPolicy: "shared CombatRuntime threshold/cooldown; no Tower-specific cap",
      encounterSource: "resolveTowerEncounter",
      favorableMatchupsOnly: true,
    });
    console.log("[TOWER_LIVE_TRIAL_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_LIVE_TRIAL_MATRIX]");
    console.table(rows);
    console.log("[TOWER_LIVE_TRIAL_FAILURES]");
    console.table(rows.filter((row) => !row.clear));

    expect(rows.length).toBeGreaterThan(0);
    expect(summary).toHaveLength(TOWER_TRIAL_BLOCK_START_FLOORS.length);
    expect(summary.every((entry) => entry.favorableWeapons > 0)).toBe(true);
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
