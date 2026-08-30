import { describe, expect, it } from "vitest";
import { TOWER_TRIAL_BLOCKS } from "@game/data";
import { getTowerBlocks, type TowerBlockDefinition } from "@game/gameplay";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactDungeonEquipment,
  type ArtifactWeaponFamily,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;
const ENDGAME_FAMILY_MASTERY = 75;
const ENDGAME_WEAPON_MASTERY = 45;
const ENDGAME_SIBLING_MASTERY = 45;
const CRITICAL_HP_THRESHOLD = 5;
const WARNING_HP_THRESHOLD = 10;
const ENDLESS_BLOCKS_PER_SEED = 20;
const ENDLESS_SEEDS = [
  "tower-benchmark-alpha",
  "tower-benchmark-beta",
  "tower-benchmark-gamma",
  "tower-benchmark-delta",
] as const;
const WEAPON_FAMILIES = ["sword", "bow", "fire_staff", "gloves", "dagger"] as const satisfies readonly ArtifactWeaponFamily[];
const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

const NEUTRAL_CAPE_FACTION_BY_ENEMY = {
  keeper: "heretic",
  heretic: "undead",
  undead: "morgana",
  morgana: "keeper",
} as const;

type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type BenchmarkBlock = Pick<
  TowerBlockDefinition,
  "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source"
>;

function getDungeonSource(block: BenchmarkBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for Tower block ${block.id}`);
  return dungeon;
}

function getFavorableWeapons(block: BenchmarkBlock): readonly BenchmarkSpec[] {
  const dungeon = getDungeonSource(block);
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.filter((weapon) => (
    resolveArtifactDungeonDamageBonusPercent(weapon.itemId(block.tier), dungeon.faction) > 0
  ));
}

function runSpecializationBlock(
  block: BenchmarkBlock,
  weapon: BenchmarkSpec,
  sampleId: string,
) {
  const tier = block.tier;
  const dungeon = getDungeonSource(block);
  const weaponItemId = weapon.itemId(tier);
  const outgoingBonus = resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction);
  if (outgoingBonus <= 0) {
    throw new Error(`${weapon.label} is not a favorable counter for Tower block ${block.id}`);
  }

  const capeItemId = `item_cape_t${tier}_${block.factionId}`;
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId, capeItemId },
    { factionId: block.factionId, tier, activity: "tower" },
  );
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );

  // .3 and .4 share the same authored raw combat-stat multiplier (1.42x).
  // This therefore models a .4 weapon before requiring any Awakening combat trait.
  const result = runCombatRuntimeBenchmark({
    label: `${sampleId}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, dungeon.faction),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    dungeonDefinitionId: dungeon.id,
    enchantment: 3,
    familyMasteryLevel: ENDGAME_FAMILY_MASTERY,
    specializationMasteryLevel: ENDGAME_WEAPON_MASTERY,
    siblingSpecializationMasteryLevel: ENDGAME_SIBLING_MASTERY,
    heroDamageMultiplier,
    useHealthPotions: true,
    healthPotionQuantity: POTION_CAP,
  });

  return {
    sampleId,
    source: block.source,
    block: block.blockIndex + 1,
    floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
    tier,
    faction: block.factionId,
    family: weapon.family,
    weapon: weapon.label,
    weaponItemId,
    familyMastery: ENDGAME_FAMILY_MASTERY,
    weaponMastery: ENDGAME_WEAPON_MASTERY,
    siblingMastery: ENDGAME_SIBLING_MASTERY,
    outgoingBonusPct: modifiers.outgoingDamageBonusPercent,
    resilienceMultiplier: modifiers.factionResilienceDamageMultiplier,
    incomingReductionPct: modifiers.incomingDamageReductionPercent,
    clearSourceRoster: result.clear,
    seconds: result.seconds,
    hpPct: result.hpPercent,
    potions: result.potionsUsed,
    encounterReached: result.encounterReached,
    bossProgressPct: result.bossProgressPercent,
    dps: result.observedDps,
    incomingDps: result.incomingDps,
  };
}

type BenchmarkRow = ReturnType<typeof runSpecializationBlock>;

function summarizeByWeapon(rows: readonly BenchmarkRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
    const weaponRows = rows.filter((row) => row.weapon === weapon.label && row.family === weapon.family);
    if (weaponRows.length === 0) {
      return {
        family: weapon.family,
        weapon: weapon.label,
        runs: 0,
        clears: 0,
        failures: 0,
        criticalRuns: 0,
        warningRuns: 0,
        criticalRatePct: 0,
        avgHpPct: 0,
        worstHpPct: 0,
        avgSeconds: 0,
      };
    }
    const clears = weaponRows.filter((row) => row.clearSourceRoster).length;
    const criticalRuns = weaponRows.filter((row) => row.hpPct < CRITICAL_HP_THRESHOLD).length;
    const hpTotal = weaponRows.reduce((sum, row) => sum + row.hpPct, 0);
    const secondsTotal = weaponRows.reduce((sum, row) => sum + row.seconds, 0);
    return {
      family: weapon.family,
      weapon: weapon.label,
      runs: weaponRows.length,
      clears,
      failures: weaponRows.length - clears,
      criticalRuns,
      warningRuns: weaponRows.filter((row) => row.hpPct >= CRITICAL_HP_THRESHOLD && row.hpPct < WARNING_HP_THRESHOLD).length,
      criticalRatePct: Number(((criticalRuns / weaponRows.length) * 100).toFixed(1)),
      avgHpPct: Number((hpTotal / weaponRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...weaponRows.map((row) => row.hpPct)).toFixed(1)),
      avgSeconds: Number((secondsTotal / weaponRows.length).toFixed(1)),
    };
  }).filter((row) => row.runs > 0);
}

function summarizeByFamily(rows: readonly BenchmarkRow[]) {
  return WEAPON_FAMILIES.map((family) => {
    const familyRows = rows.filter((row) => row.family === family);
    const clears = familyRows.filter((row) => row.clearSourceRoster).length;
    const criticalRuns = familyRows.filter((row) => row.hpPct < CRITICAL_HP_THRESHOLD).length;
    return {
      family,
      runs: familyRows.length,
      clears,
      failures: familyRows.length - clears,
      criticalRuns,
      warningRuns: familyRows.filter((row) => row.hpPct >= CRITICAL_HP_THRESHOLD && row.hpPct < WARNING_HP_THRESHOLD).length,
      criticalRatePct: Number(((criticalRuns / familyRows.length) * 100).toFixed(1)),
      avgHpPct: Number((familyRows.reduce((sum, row) => sum + row.hpPct, 0) / familyRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...familyRows.map((row) => row.hpPct)).toFixed(1)),
    };
  });
}

function runBlockRows(block: BenchmarkBlock, sampleId: string): BenchmarkRow[] {
  return getFavorableWeapons(block).map((weapon) => runSpecializationBlock(block, weapon, sampleId));
}

function runFactionNeutralMatrix() {
  return DUNGEON_DEFINITIONS
    .filter((dungeon) => FACTIONS.includes(dungeon.faction.toLowerCase() as (typeof FACTIONS)[number]))
    .flatMap((dungeon) => {
      const faction = dungeon.faction.toLowerCase() as (typeof FACTIONS)[number];
      const neutralCapeFaction = NEUTRAL_CAPE_FACTION_BY_ENEMY[faction];
      return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
        const weaponItemId = weapon.itemId(dungeon.tier);
        const result = runCombatRuntimeBenchmark({
          label: `neutral_${faction}_t${String(dungeon.tier)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
          weaponItemId,
          equipmentItemIds: artifactDungeonEquipment(weaponItemId, dungeon.tier, neutralCapeFaction),
          zoneDefId: WORLD_ZONE_IDS.mountain,
          segmentIndex: 9,
          dungeonDefinitionId: dungeon.id,
          enchantment: 3,
          familyMasteryLevel: ENDGAME_FAMILY_MASTERY,
          specializationMasteryLevel: ENDGAME_WEAPON_MASTERY,
          siblingSpecializationMasteryLevel: ENDGAME_SIBLING_MASTERY,
          heroDamageMultiplier: 1,
          useHealthPotions: true,
          healthPotionQuantity: POTION_CAP,
        });
        return {
          faction,
          tier: dungeon.tier,
          family: weapon.family,
          weapon: weapon.label,
          clear: result.clear,
          seconds: result.seconds,
          hpPct: result.hpPercent,
          potions: result.potionsUsed,
          bossProgressPct: result.bossProgressPercent,
          dps: result.observedDps,
          incomingDps: result.incomingDps,
          capeReductionPct: result.dungeonDamageReductionPercent,
        };
      });
    });
}

function summarizeNeutralByWeapon(rows: ReturnType<typeof runFactionNeutralMatrix>) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
    const weaponRows = rows.filter((row) => row.family === weapon.family && row.weapon === weapon.label);
    const clears = weaponRows.filter((row) => row.clear).length;
    return {
      family: weapon.family,
      weapon: weapon.label,
      runs: weaponRows.length,
      clears,
      failures: weaponRows.length - clears,
      avgHpPct: Number((weaponRows.reduce((sum, row) => sum + row.hpPct, 0) / weaponRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...weaponRows.map((row) => row.hpPct)).toFixed(1)),
      avgDps: Number((weaponRows.reduce((sum, row) => sum + row.dps, 0) / weaponRows.length).toFixed(1)),
      avgSeconds: Number((weaponRows.reduce((sum, row) => sum + row.seconds, 0) / weaponRows.length).toFixed(1)),
    };
  });
}

function summarizeNeutralByFaction(rows: ReturnType<typeof runFactionNeutralMatrix>) {
  return FACTIONS.flatMap((faction) => [4, 5, 6, 7, 8].map((tier) => {
    const contextRows = rows.filter((row) => row.faction === faction && row.tier === tier);
    const clears = contextRows.filter((row) => row.clear).length;
    return {
      faction,
      tier,
      runs: contextRows.length,
      clears,
      failures: contextRows.length - clears,
      avgHpPct: Number((contextRows.reduce((sum, row) => sum + row.hpPct, 0) / contextRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...contextRows.map((row) => row.hpPct)).toFixed(1)),
      avgIncomingDps: Number((contextRows.reduce((sum, row) => sum + row.incomingDps, 0) / contextRows.length).toFixed(1)),
    };
  }));
}

describe("Tower runtime specialization benchmark", () => {
  it("benchmarks every favorable artifact specialization across Trial and repeated Endless contexts", () => {
    const trialRows = TOWER_TRIAL_BLOCKS.flatMap((block) => (
      runBlockRows({ ...block, source: "trial" }, `tower_trial_block_${String(block.blockIndex + 1)}`)
    ));

    const endlessRows = ENDLESS_SEEDS.flatMap((seed) => {
      const blocks = getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed);
      return blocks.flatMap((block) => runBlockRows(
        block,
        `tower_endless_${seed}_block_${String(block.blockIndex + 1)}`,
      ));
    });

    const allRows = [...trialRows, ...endlessRows];
    const specializationSummary = summarizeByWeapon(allRows);
    const familySummary = summarizeByFamily(allRows);

    console.log("[TOWER_TRIAL_ENDGAME_ALL_SPECIALIZATIONS]");
    console.table(trialRows);
    console.log("[TOWER_ENDLESS_ENDGAME_ALL_SPECIALIZATIONS]");
    console.table(endlessRows);
    console.log("[TOWER_ENDGAME_SPECIALIZATION_SUMMARY]");
    console.table(specializationSummary);
    console.log("[TOWER_ENDGAME_FAMILY_SUMMARY]");
    console.table(familySummary);
    console.log("[TOWER_ENDGAME_SPECIALIZATION_NOTE] favorable artifact specializations are repeated across authored Trial plus four deterministic Endless seeds (20 blocks each) at 75 family / 45 equipped specialization / 45 siblings, raw .4 weapon scaling + .3 armor/cape, before requiring Awakening combat traits. Critical means <5% ending HP; warning means 5-10%. The generic Dungeon-roster harness still does not inject Tower reinforced role tuning.");

    expect(trialRows).toHaveLength(TOWER_TRIAL_BLOCKS.length * WEAPON_FAMILIES.length);
    expect(endlessRows).toHaveLength(ENDLESS_SEEDS.length * ENDLESS_BLOCKS_PER_SEED * WEAPON_FAMILIES.length);
    expect(allRows.every((row) => row.outgoingBonusPct > 0)).toBe(true);
    expect(allRows.every((row) => row.resilienceMultiplier === 0.9)).toBe(true);

    for (const family of WEAPON_FAMILIES) {
      const familyWeapons = specializationSummary.filter((row) => row.family === family);
      expect(familyWeapons.length).toBeGreaterThan(1);
      expect(familyWeapons.every((row) => row.runs >= ENDLESS_SEEDS.length)).toBe(true);
    }
  });

  it("compares every artifact specialization on a faction-neutral T4-T8 matrix", () => {
    const rows = runFactionNeutralMatrix();
    const weaponSummary = summarizeNeutralByWeapon(rows);
    const factionSummary = summarizeNeutralByFaction(rows);

    console.log("[FACTION_NEUTRAL_ALL_WEAPONS]");
    console.table(rows);
    console.log("[FACTION_NEUTRAL_WEAPON_SUMMARY]");
    console.table(weaponSummary);
    console.log("[FACTION_NEUTRAL_CONTEXT_SUMMARY]");
    console.table(factionSummary);
    console.log("[FACTION_NEUTRAL_NOTE] no anti-faction weapon bonus, no Tower resilience multiplier, and a deliberately non-matching faction cape so Dungeon faction damage reduction remains 0. This isolates weapon specialization performance from faction combat modifiers while preserving each authored faction/tier enemy roster.");

    expect(rows).toHaveLength(FACTIONS.length * 5 * ARTIFACT_WEAPON_BENCHMARK_SPECS.length);
    expect(rows.every((row) => row.capeReductionPct === 0)).toBe(true);
    expect(weaponSummary.every((row) => row.runs === FACTIONS.length * 5)).toBe(true);
    expect(factionSummary.every((row) => row.runs === ARTIFACT_WEAPON_BENCHMARK_SPECS.length)).toBe(true);
  });
});
