import { describe, expect, it } from "vitest";
import { getTowerDepthDifficultyMultiplier, type TowerFactionId, type TowerTier } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCapeDungeonDamageReductionPercent } from "./factionCapeContentCatalog.js";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TOWER_SEED = "tower-live-progression-monotonicity-v1";
const FIRST_ENDLESS_FLOOR = 26;
const LAST_BENCHMARK_FLOOR = 125;
const BLOCK_SIZE = 5;
const WEAPON_ENCHANTMENT = 4 as const;
const EQUIPMENT_ENCHANTMENT = 3 as const;
const POTION_STOCK = 99;
const AWAKENED_STRAIN = 10;
const AWAKENED_ITEM_POWER = 15;
const SIGNIFICANT_HP_GAIN = 3;

const round1 = (value: number): number => Number(value.toFixed(1));

function resolveLiveBlock(blockStartFloor: number) {
  const encounters = Array.from({ length: BLOCK_SIZE }, (_, index) => (
    resolveTowerEncounter(blockStartFloor + index, TOWER_SEED)
  ));
  const first = encounters[0]!;
  return {
    blockStartFloor,
    blockEndFloor: blockStartFloor + BLOCK_SIZE - 1,
    tier: first.floorDefinition.block.tier,
    faction: first.floorDefinition.block.factionId,
    depthMultiplier: getTowerDepthDifficultyMultiplier(blockStartFloor),
    authoredEncounters: encounters.map((encounter) => ({
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: encounter.combatProfile,
    })),
  };
}

function runBlockWeapon(
  block: ReturnType<typeof resolveLiveBlock>,
  weapon: (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number],
) {
  const tier: TowerTier = block.tier;
  const faction: TowerFactionId = block.faction;
  const dungeon = DUNGEON_DEFINITIONS.find((definition) => (
    definition.tier === tier && definition.faction.toLowerCase() === faction
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for ${faction} T${String(tier)}`);

  const weaponItemId = weapon.itemId(tier);
  const bonusPct = resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction);
  if (bonusPct <= 0) return undefined;

  const mastery = artifactBenchmarkMasteryProfile(tier);
  const capeItemId = `item_cape_t${String(tier)}_${faction}`;
  const incomingDamageReductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
    capeItemId,
    { factionId: faction, tier },
  );

  const result = runCombatRuntimeBenchmark({
    label: `tower_live_progression_f${String(block.blockStartFloor)}_${weapon.family}_${weapon.label}`,
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, faction),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    authoredEncounters: block.authoredEncounters,
    enchantment: WEAPON_ENCHANTMENT,
    equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
    awakenedWeapon: {
      strain: AWAKENED_STRAIN,
      traits: [{ traitId: "item_power", value: AWAKENED_ITEM_POWER }],
    },
    familyMasteryLevel: mastery.familyMasteryLevel,
    specializationMasteryLevel: mastery.specializationMasteryLevel,
    siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
    useHealthPotions: true,
    healthPotionQuantity: POTION_STOCK,
    heroDamageMultiplier: 1 + bonusPct / 100,
    incomingDamageReductionPercent,
  });

  const boss = result.encounters[4];
  return {
    blockStartFloor: block.blockStartFloor,
    blockEndFloor: block.blockEndFloor,
    depthMultiplier: round1(block.depthMultiplier),
    depthPct: Math.round((block.depthMultiplier - 1) * 100),
    tier,
    faction,
    family: weapon.family,
    weapon: weapon.label,
    clear: result.clear,
    hpPct: round1(result.hpPercent),
    totalPotions: result.potionsUsed,
    bossPotions: boss?.potionsUsed ?? 0,
    hpBeforeBossPct: round1(boss?.hpBeforePercent ?? 0),
    bossHpAfterPct: round1(boss?.hpAfterPercent ?? 0),
    bossSeconds: round1(boss?.seconds ?? 0),
    bossAbilityCasts: boss?.abilities.reduce((sum, ability) => sum + ability.casts, 0) ?? 0,
  };
}

describe("Tower live block progression monotonicity benchmark", () => {
  it("reports real Endless block-to-block recurrence inversions", () => {
    const blocks = Array.from(
      { length: Math.floor((LAST_BENCHMARK_FLOOR - FIRST_ENDLESS_FLOOR + 1) / BLOCK_SIZE) },
      (_, index) => resolveLiveBlock(FIRST_ENDLESS_FLOOR + index * BLOCK_SIZE),
    );

    const rows = blocks.flatMap((block) => (
      ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => {
        const row = runBlockWeapon(block, weapon);
        return row === undefined ? [] : [row];
      })
    ));

    const comparableByKey = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.weapon}|${String(row.tier)}|${row.faction}`;
      const existing = comparableByKey.get(key) ?? [];
      existing.push(row);
      comparableByKey.set(key, existing);
    }

    const comparisons = [...comparableByKey.values()].flatMap((group) => {
      const sorted = [...group].sort((a, b) => a.blockStartFloor - b.blockStartFloor);
      return sorted.slice(1).flatMap((current, index) => {
        const previous = sorted[index];
        if (previous === undefined || !previous.clear || !current.clear) return [];
        const hpGainPct = round1(current.hpPct - previous.hpPct);
        const potionGain = current.totalPotions - previous.totalPotions;
        const bossPotionGain = current.bossPotions - previous.bossPotions;
        return [{
          weapon: current.weapon,
          family: current.family,
          tier: current.tier,
          faction: current.faction,
          fromFloors: `${String(previous.blockStartFloor)}-${String(previous.blockEndFloor)}`,
          toFloors: `${String(current.blockStartFloor)}-${String(current.blockEndFloor)}`,
          fromDepthPct: previous.depthPct,
          toDepthPct: current.depthPct,
          fromHpPct: previous.hpPct,
          toHpPct: current.hpPct,
          hpGainPct,
          potionGain,
          bossPotionGain,
          fromTotalPotions: previous.totalPotions,
          toTotalPotions: current.totalPotions,
          fromBossPotions: previous.bossPotions,
          toBossPotions: current.bossPotions,
        }];
      });
    });

    const significantInversions = comparisons.filter((row) => row.hpGainPct >= SIGNIFICANT_HP_GAIN);
    const potionLinked = significantInversions.filter((row) => row.potionGain > 0 || row.bossPotionGain > 0);

    const blockSummary = blocks.map((block) => {
      const blockRows = rows.filter((row) => row.blockStartFloor === block.blockStartFloor);
      const clears = blockRows.filter((row) => row.clear);
      return {
        floors: `${String(block.blockStartFloor)}-${String(block.blockEndFloor)}`,
        tier: block.tier,
        faction: block.faction,
        depthMultiplier: block.depthMultiplier,
        clears: `${String(clears.length)}/${String(blockRows.length)}`,
        minClearHpPct: clears.length === 0 ? null : Math.min(...clears.map((row) => row.hpPct)),
        maxClearHpPct: clears.length === 0 ? null : Math.max(...clears.map((row) => row.hpPct)),
        maxPotions: blockRows.length === 0 ? 0 : Math.max(...blockRows.map((row) => row.totalPotions)),
      };
    });

    console.log("[TOWER_LIVE_PROGRESSION_MONOTONICITY_REFERENCE]", {
      seed: TOWER_SEED,
      floors: `${String(FIRST_ENDLESS_FLOOR)}-${String(LAST_BENCHMARK_FLOOR)}`,
      comparisonRule: "successive live occurrences of identical weapon+tier+faction; both occurrences must clear",
      significantHpGainPct: SIGNIFICANT_HP_GAIN,
      potionRules: "live runtime, uncapped inventory stock",
      baseline: ".4 weapon, .3 equipment, strain 10 + 15 Item Power, favorable faction matchup",
    });
    console.log("[TOWER_LIVE_PROGRESSION_BLOCKS]");
    console.table(blockSummary);
    console.log("[TOWER_LIVE_PROGRESSION_MONOTONICITY_SUMMARY]");
    console.table([{
      liveBlocks: blocks.length,
      favorableRuns: rows.length,
      recurrenceComparisons: comparisons.length,
      significantRecurrenceInversions: significantInversions.length,
      potionLinkedRecurrenceInversions: potionLinked.length,
      largestRecurrenceHpGainPct: significantInversions.length === 0
        ? 0
        : Math.max(...significantInversions.map((row) => row.hpGainPct)),
      largestPotionLinkedHpGainPct: potionLinked.length === 0
        ? 0
        : Math.max(...potionLinked.map((row) => row.hpGainPct)),
    }]);
    console.log("[TOWER_LIVE_PROGRESSION_INVERSIONS]");
    console.table(significantInversions);
    console.log("[TOWER_LIVE_PROGRESSION_POTION_LINKED]");
    console.table(potionLinked);

    expect(blocks).toHaveLength(20);
    expect(rows).toHaveLength(100);
  });
});
