import { describe, expect, it } from "vitest";
import { TOWER_TRIAL_BLOCKS } from "@game/data";
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
const WEAPON_FAMILIES = ["sword", "bow", "fire_staff", "gloves", "dagger"] as const satisfies readonly ArtifactWeaponFamily[];

type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type TowerBlock = (typeof TOWER_TRIAL_BLOCKS)[number];

function getDungeonSource(block: TowerBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for Tower block ${block.id}`);
  return dungeon;
}

function getFavorableWeapons(block: TowerBlock): readonly BenchmarkSpec[] {
  const dungeon = getDungeonSource(block);
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.filter((weapon) => (
    resolveArtifactDungeonDamageBonusPercent(weapon.itemId(block.tier), dungeon.faction) > 0
  ));
}

function runSpecializationBlock(block: TowerBlock, weapon: BenchmarkSpec) {
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
    label: `tower_trial_block_${String(block.blockIndex + 1)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
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

function summarizeByWeapon(rows: readonly ReturnType<typeof runSpecializationBlock>[]) {
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
        avgHpPct: 0,
        worstHpPct: 0,
        avgSeconds: 0,
      };
    }
    const clears = weaponRows.filter((row) => row.clearSourceRoster).length;
    const hpTotal = weaponRows.reduce((sum, row) => sum + row.hpPct, 0);
    const secondsTotal = weaponRows.reduce((sum, row) => sum + row.seconds, 0);
    return {
      family: weapon.family,
      weapon: weapon.label,
      runs: weaponRows.length,
      clears,
      failures: weaponRows.length - clears,
      criticalRuns: weaponRows.filter((row) => row.hpPct < CRITICAL_HP_THRESHOLD).length,
      warningRuns: weaponRows.filter((row) => row.hpPct >= CRITICAL_HP_THRESHOLD && row.hpPct < WARNING_HP_THRESHOLD).length,
      avgHpPct: Number((hpTotal / weaponRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...weaponRows.map((row) => row.hpPct)).toFixed(1)),
      avgSeconds: Number((secondsTotal / weaponRows.length).toFixed(1)),
    };
  }).filter((row) => row.runs > 0);
}

describe("Tower trial runtime benchmark", () => {
  it("benchmarks every favorable artifact specialization instead of one representative per family", () => {
    const rows = TOWER_TRIAL_BLOCKS.flatMap((block) => (
      getFavorableWeapons(block).map((weapon) => runSpecializationBlock(block, weapon))
    ));
    const summary = summarizeByWeapon(rows);

    console.log("[TOWER_TRIAL_ENDGAME_ALL_SPECIALIZATIONS]");
    console.table(rows);
    console.log("[TOWER_TRIAL_ENDGAME_SPECIALIZATION_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_TRIAL_ENDGAME_ALL_SPECIALIZATIONS_NOTE] every artifact specialization with a favorable faction matchup is tested at 75 family / 45 equipped specialization / 45 siblings, raw .4 weapon scaling + .3 armor/cape, before requiring Awakening combat traits. Critical means <5% ending HP; warning means 5-10%. Floor 3 reinforced Tower tuning is still not represented by this generic Dungeon-roster harness.");

    expect(rows.length).toBeGreaterThan(TOWER_TRIAL_BLOCKS.length * WEAPON_FAMILIES.length);
    expect(rows.every((row) => row.outgoingBonusPct > 0)).toBe(true);
    expect(rows.every((row) => row.resilienceMultiplier === 0.9)).toBe(true);

    for (const block of TOWER_TRIAL_BLOCKS) {
      const blockRows = rows.filter((row) => row.block === block.blockIndex + 1);
      expect(new Set(blockRows.map((row) => row.family))).toEqual(new Set(WEAPON_FAMILIES));
    }

    for (const family of WEAPON_FAMILIES) {
      const familyWeapons = summary.filter((row) => row.family === family);
      expect(familyWeapons.length).toBeGreaterThan(1);
    }
  });
});
