import { describe, expect, it, vi } from "vitest";
import { TOWER_TRIAL_BLOCKS } from "@game/data";
import { getTowerBlocks, type TowerBlockDefinition } from "@game/gameplay";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

interface DungeonCombatProfileInput {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}

interface DungeonContentMockSurface {
  readonly resolveDungeonCombatProfile: (
    input: DungeonCombatProfileInput,
  ) => AuthoredEnemyCombatProfile;
  readonly [key: string]: unknown;
}

const towerProfileOverride = vi.hoisted(() => ({
  profiles: undefined as readonly AuthoredEnemyCombatProfile[] | undefined,
}));

vi.mock("./dungeonContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<DungeonContentMockSurface>();
  return {
    ...actual,
    resolveDungeonCombatProfile: (input: DungeonCombatProfileInput) => (
      towerProfileOverride.profiles?.[input.encounterIndex]
      ?? actual.resolveDungeonCombatProfile(input)
    ),
  };
});

import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactDungeonEquipment,
  type ArtifactBenchmarkTier,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;
const ENDGAME_FAMILY_MASTERY = 75;
const ENDGAME_WEAPON_MASTERY = 45;
const ENDGAME_SIBLING_MASTERY = 45;
const ENDLESS_BLOCKS_PER_SEED = 20;
const ENDLESS_SEEDS = [
  "tower-benchmark-alpha",
  "tower-benchmark-beta",
  "tower-benchmark-gamma",
  "tower-benchmark-delta",
] as const;
const TRIAL_SEED = "tower-global-difficulty-trial";
const DIFFICULTY_PRESETS = [1, 1.15, 1.25, 1.35, 1.45] as const;
const TIERS = [4, 5, 6, 7, 8] as const;

type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type BenchmarkBlock = Pick<
  TowerBlockDefinition,
  "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source"
>;
type Matchup = "favorable" | "neutral";

function isArtifactBenchmarkTier(tier: number): tier is ArtifactBenchmarkTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}

function getDungeonSource(block: BenchmarkBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for Tower block ${block.id}`);
  return dungeon;
}

function scaleTowerProfile(
  profile: AuthoredEnemyCombatProfile,
  multiplier: number,
): AuthoredEnemyCombatProfile {
  if (multiplier === 1) return profile;
  return {
    hp: Math.round(profile.hp * multiplier),
    damage: Math.round(profile.damage * multiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * multiplier),
    magicResistance: Math.round(profile.magicResistance * multiplier),
  };
}

function runWeaponBlock(
  block: BenchmarkBlock,
  weapon: BenchmarkSpec,
  towerSeed: string,
  preset: number,
) {
  if (!isArtifactBenchmarkTier(block.tier)) {
    throw new Error(`Unsupported Tower benchmark tier T${String(block.tier)} in ${block.id}`);
  }
  const tier = block.tier;
  const dungeon = getDungeonSource(block);
  const weaponItemId = weapon.itemId(tier);
  const capeItemId = `item_cape_t${String(tier)}_${block.factionId}`;
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId, capeItemId },
    { factionId: block.factionId, tier, activity: "tower" },
  );
  const matchup: Matchup = modifiers.outgoingDamageBonusPercent > 0 ? "favorable" : "neutral";
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );

  const floors = Array.from(
    { length: block.floorEnd - block.floorStart + 1 },
    (_, index) => block.floorStart + index,
  );
  const resolvedFloors = floors.map((floor) => resolveTowerEncounter(floor, towerSeed));
  towerProfileOverride.profiles = resolvedFloors.map((entry) => (
    scaleTowerProfile(entry.combatProfile, preset)
  ));

  try {
    const result = runCombatRuntimeBenchmark({
      label: `tower_global_${String(preset)}_${String(block.blockIndex + 1)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
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
      preset,
      tier,
      faction: block.factionId,
      family: weapon.family,
      weapon: weapon.label,
      matchup,
      block: block.blockIndex + 1,
      floorEnd: block.floorEnd,
      clear: result.clear,
      hpPct: result.hpPercent,
      failedFloor: result.clear ? null : block.floorStart + result.encounterReached - 1,
      failedFloorProgressPct: result.clear ? 100 : result.encounterProgressPercent,
    };
  } finally {
    towerProfileOverride.profiles = undefined;
  }
}

type BenchmarkRow = ReturnType<typeof runWeaponBlock>;

function runPreset(preset: number): BenchmarkRow[] {
  const trialRows = TOWER_TRIAL_BLOCKS.flatMap((block) => (
    ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => runWeaponBlock(
      { ...block, source: "trial" },
      weapon,
      TRIAL_SEED,
      preset,
    ))
  ));
  const endlessRows = ENDLESS_SEEDS.flatMap((seed) => {
    const blocks = getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed);
    return blocks.flatMap((block) => ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => (
      runWeaponBlock(block, weapon, seed, preset)
    )));
  });
  return [...trialRows, ...endlessRows];
}

function summarizePreset(rows: readonly BenchmarkRow[], preset: number) {
  const scoped = rows.filter((row) => row.preset === preset);
  const favorable = scoped.filter((row) => row.matchup === "favorable");
  const favorableClears = favorable.filter((row) => row.clear);
  const neutral = scoped.filter((row) => row.matchup === "neutral");
  const neutralClears = neutral.filter((row) => row.clear);
  return {
    preset: `x${preset.toFixed(2)}`,
    favorableRuns: favorable.length,
    favorableClears: favorableClears.length,
    favorableClearRatePct: Number(((favorableClears.length / favorable.length) * 100).toFixed(1)),
    favorableAvgClearHpPct: favorableClears.length === 0
      ? 0
      : Number((favorableClears.reduce((sum, row) => sum + row.hpPct, 0) / favorableClears.length).toFixed(1)),
    favorableWorstClearHpPct: favorableClears.length === 0
      ? 0
      : Number(Math.min(...favorableClears.map((row) => row.hpPct)).toFixed(1)),
    neutralRuns: neutral.length,
    neutralClears: neutralClears.length,
    neutralClearRatePct: Number(((neutralClears.length / neutral.length) * 100).toFixed(1)),
    neutralDeepestClearedFloor: neutralClears.length === 0
      ? null
      : Math.max(...neutralClears.map((row) => row.floorEnd)),
  };
}

function summarizePresetByTier(rows: readonly BenchmarkRow[], preset: number) {
  return TIERS.flatMap((tier) => (["favorable", "neutral"] as const).map((matchup) => {
    const scoped = rows.filter((row) => (
      row.preset === preset && row.tier === tier && row.matchup === matchup
    ));
    const clears = scoped.filter((row) => row.clear);
    return {
      preset: `x${preset.toFixed(2)}`,
      tier,
      matchup,
      runs: scoped.length,
      clears: clears.length,
      clearRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      avgClearHpPct: clears.length === 0
        ? 0
        : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
      worstClearHpPct: clears.length === 0
        ? 0
        : Number(Math.min(...clears.map((row) => row.hpPct)).toFixed(1)),
    };
  }));
}

function summarizeFavorableFailures(rows: readonly BenchmarkRow[]) {
  return rows
    .filter((row) => row.matchup === "favorable" && !row.clear)
    .map((row) => ({
      preset: `x${row.preset.toFixed(2)}`,
      tier: row.tier,
      faction: row.faction,
      family: row.family,
      weapon: row.weapon,
      block: row.block,
      failedFloor: row.failedFloor,
      failedFloorProgressPct: row.failedFloorProgressPct,
    }));
}

function summarizeNeutralLeaks(rows: readonly BenchmarkRow[]) {
  return DIFFICULTY_PRESETS.flatMap((preset) => TIERS.map((tier) => {
    const scoped = rows.filter((row) => (
      row.preset === preset && row.tier === tier && row.matchup === "neutral"
    ));
    const clears = scoped.filter((row) => row.clear);
    return {
      preset: `x${preset.toFixed(2)}`,
      tier,
      neutralRuns: scoped.length,
      neutralClears: clears.length,
      leakRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
    };
  }));
}

describe("Tower global difficulty tuning benchmark", () => {
  it("compares Tower-only global difficulty presets with all live faction modifiers", () => {
    const rows = DIFFICULTY_PRESETS.flatMap((preset) => runPreset(preset));
    const presetSummary = DIFFICULTY_PRESETS.map((preset) => summarizePreset(rows, preset));
    const tierSummary = DIFFICULTY_PRESETS.flatMap((preset) => summarizePresetByTier(rows, preset));
    const favorableFailures = summarizeFavorableFailures(rows);
    const neutralLeaks = summarizeNeutralLeaks(rows);

    console.log("[TOWER_GLOBAL_DIFFICULTY_PRESET_SUMMARY]");
    console.table(presetSummary);
    console.log("[TOWER_GLOBAL_DIFFICULTY_TIER_SUMMARY]");
    console.table(tierSummary);
    console.log("[TOWER_GLOBAL_DIFFICULTY_FAVORABLE_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_GLOBAL_DIFFICULTY_NEUTRAL_LEAKS_BY_TIER]");
    console.table(neutralLeaks);
    console.log("[TOWER_GLOBAL_DIFFICULTY_NOTE] Benchmark-only presets scale the already-resolved Tower enemy profile uniformly on HP, damage, armor and magic resistance. Attack speed, faction normalization, floor role, depth scaling, anti-faction weapon bonus, faction cape, resilience, masteries and potion cap remain unchanged. No production balance value is modified.");

    expect(rows.length).toBeGreaterThan(0);
    expect(presetSummary).toHaveLength(DIFFICULTY_PRESETS.length);
    expect(rows.some((row) => row.matchup === "favorable")).toBe(true);
    expect(rows.some((row) => row.matchup === "neutral")).toBe(true);
  }, 300_000);
});
