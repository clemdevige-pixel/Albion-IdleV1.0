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
const TRIAL_SEED = "tower-faction-tier-calibration-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

type BenchmarkFaction = (typeof FACTIONS)[number];
type CalibrationId = "tier_only_control" | "faction_tier_candidate";

const TIER_ONLY_CONTROL = {
  4: 1.5,
  5: 1.5,
  6: 1.55,
  7: 1.65,
  8: 1.15,
} as const satisfies Readonly<Record<ArtifactBenchmarkTier, number>>;

/**
 * Benchmark-only first pass derived from collective favorable failures in the
 * tier-only profile. Changes are deliberately moderate: the goal is to remove
 * faction walls, not to rescue isolated weak weapons through faction tuning.
 */
const FACTION_TIER_CANDIDATE = {
  keeper: { 4: 1.5, 5: 1.4, 6: 1.48, 7: 1.5, 8: 1.13 },
  heretic: { 4: 1.45, 5: 1.47, 6: 1.47, 7: 1.58, 8: 1.15 },
  undead: { 4: 1.5, 5: 1.47, 6: 1.55, 7: 1.58, 8: 1.15 },
  morgana: { 4: 1.5, 5: 1.43, 6: 1.48, 7: 1.65, 8: 1.15 },
} as const satisfies Readonly<Record<BenchmarkFaction, Readonly<Record<ArtifactBenchmarkTier, number>>>>;

const CALIBRATIONS = ["tier_only_control", "faction_tier_candidate"] as const satisfies readonly CalibrationId[];

type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type BenchmarkBlock = Pick<
  TowerBlockDefinition,
  "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source"
>;
type Matchup = "favorable" | "neutral";

function isArtifactBenchmarkTier(tier: number): tier is ArtifactBenchmarkTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}

function isBenchmarkFaction(factionId: string): factionId is BenchmarkFaction {
  return FACTIONS.includes(factionId as BenchmarkFaction);
}

function getDungeonSource(block: BenchmarkBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for Tower block ${block.id}`);
  return dungeon;
}

function resolveCalibrationMultiplier(
  calibration: CalibrationId,
  faction: BenchmarkFaction,
  tier: ArtifactBenchmarkTier,
): number {
  if (calibration === "tier_only_control") return TIER_ONLY_CONTROL[tier];
  return FACTION_TIER_CANDIDATE[faction][tier];
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
  calibration: CalibrationId,
) {
  if (!isArtifactBenchmarkTier(block.tier)) {
    throw new Error(`Unsupported Tower benchmark tier T${String(block.tier)} in ${block.id}`);
  }
  if (!isBenchmarkFaction(block.factionId)) {
    throw new Error(`Unsupported Tower benchmark faction ${block.factionId} in ${block.id}`);
  }

  const tier = block.tier;
  const faction = block.factionId;
  const multiplier = resolveCalibrationMultiplier(calibration, faction, tier);
  const dungeon = getDungeonSource(block);
  const weaponItemId = weapon.itemId(tier);
  const capeItemId = `item_cape_t${String(tier)}_${faction}`;
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId, capeItemId },
    { factionId: faction, tier, activity: "tower" },
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
    scaleTowerProfile(entry.combatProfile, multiplier)
  ));

  try {
    const result = runCombatRuntimeBenchmark({
      label: `tower_faction_tier_${calibration}_${faction}_t${String(tier)}_${String(block.blockIndex + 1)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
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
      calibration,
      tier,
      faction,
      multiplier,
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

function runCalibration(calibration: CalibrationId): BenchmarkRow[] {
  const trialRows = TOWER_TRIAL_BLOCKS.flatMap((block) => (
    ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => runWeaponBlock(
      { ...block, source: "trial" },
      weapon,
      TRIAL_SEED,
      calibration,
    ))
  ));
  const endlessRows = ENDLESS_SEEDS.flatMap((seed) => {
    const blocks = getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed);
    return blocks.flatMap((block) => ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => (
      runWeaponBlock(block, weapon, seed, calibration)
    )));
  });
  return [...trialRows, ...endlessRows];
}

function summarizeFactionTier(rows: readonly BenchmarkRow[]) {
  return CALIBRATIONS.flatMap((calibration) => FACTIONS.flatMap((faction) => TIERS.flatMap((tier) => (
    ["favorable", "neutral"] as const
  ).map((matchup) => {
    const scoped = rows.filter((row) => (
      row.calibration === calibration
      && row.faction === faction
      && row.tier === tier
      && row.matchup === matchup
    ));
    if (scoped.length === 0) return undefined;
    const clears = scoped.filter((row) => row.clear);
    return {
      calibration,
      faction,
      tier,
      multiplier: resolveCalibrationMultiplier(calibration, faction, tier),
      matchup,
      runs: scoped.length,
      clears: clears.length,
      failures: scoped.length - clears.length,
      clearRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      avgClearHpPct: clears.length === 0
        ? 0
        : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
      worstClearHpPct: clears.length === 0
        ? 0
        : Number(Math.min(...clears.map((row) => row.hpPct)).toFixed(1)),
    };
  })))).filter((row) => row !== undefined);
}

function summarizeCandidateFavorableFailures(rows: readonly BenchmarkRow[]) {
  return rows
    .filter((row) => (
      row.calibration === "faction_tier_candidate"
      && row.matchup === "favorable"
      && !row.clear
    ))
    .map((row) => ({
      faction: row.faction,
      tier: row.tier,
      multiplier: row.multiplier,
      family: row.family,
      weapon: row.weapon,
      block: row.block,
      failedFloor: row.failedFloor,
      failedFloorProgressPct: row.failedFloorProgressPct,
    }));
}

function summarizeCandidateNeutralLeaksByFactionTier(rows: readonly BenchmarkRow[]) {
  return FACTIONS.flatMap((faction) => TIERS.map((tier) => {
    const scoped = rows.filter((row) => (
      row.calibration === "faction_tier_candidate"
      && row.faction === faction
      && row.tier === tier
      && row.matchup === "neutral"
    ));
    if (scoped.length === 0) return undefined;
    const clears = scoped.filter((row) => row.clear);
    return {
      faction,
      tier,
      multiplier: FACTION_TIER_CANDIDATE[faction][tier],
      neutralRuns: scoped.length,
      neutralClears: clears.length,
      leakRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      deepestClearedFloor: clears.length === 0
        ? null
        : Math.max(...clears.map((row) => row.floorEnd)),
    };
  })).filter((row) => row !== undefined);
}

function summarizeCandidateFavorableByWeaponTier(rows: readonly BenchmarkRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => TIERS.map((tier) => {
    const scoped = rows.filter((row) => (
      row.calibration === "faction_tier_candidate"
      && row.family === weapon.family
      && row.weapon === weapon.label
      && row.tier === tier
      && row.matchup === "favorable"
    ));
    if (scoped.length === 0) return undefined;
    const clears = scoped.filter((row) => row.clear);
    return {
      family: weapon.family,
      weapon: weapon.label,
      tier,
      runs: scoped.length,
      clears: clears.length,
      failures: scoped.length - clears.length,
      clearRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      avgClearHpPct: clears.length === 0
        ? 0
        : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
      worstClearHpPct: clears.length === 0
        ? 0
        : Number(Math.min(...clears.map((row) => row.hpPct)).toFixed(1)),
    };
  })).filter((row) => row !== undefined);
}

describe("Tower faction x tier difficulty calibration benchmark", () => {
  it("compares tier-only control against a targeted faction x tier candidate", () => {
    const rows = CALIBRATIONS.flatMap((calibration) => runCalibration(calibration));
    const factionTierSummary = summarizeFactionTier(rows);
    const favorableWeaponTierSummary = summarizeCandidateFavorableByWeaponTier(rows);
    const favorableFailures = summarizeCandidateFavorableFailures(rows);
    const neutralLeaks = summarizeCandidateNeutralLeaksByFactionTier(rows);

    console.log("[TOWER_FACTION_TIER_CALIBRATION_MATRIX]");
    console.table(FACTIONS.flatMap((faction) => TIERS.map((tier) => ({
      faction,
      tier,
      control: TIER_ONLY_CONTROL[tier],
      candidate: FACTION_TIER_CANDIDATE[faction][tier],
    }))));
    console.log("[TOWER_FACTION_TIER_CALIBRATION_SUMMARY]");
    console.table(factionTierSummary);
    console.log("[TOWER_FACTION_TIER_CANDIDATE_FAVORABLE_WEAPON_TIER_SUMMARY]");
    console.table(favorableWeaponTierSummary);
    console.log("[TOWER_FACTION_TIER_CANDIDATE_FAVORABLE_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_FACTION_TIER_CANDIDATE_NEUTRAL_LEAKS]");
    console.table(neutralLeaks);
    console.log("[TOWER_FACTION_TIER_CALIBRATION_NOTE] Benchmark-only candidate adjusts the post-resolver Tower enemy profile per faction and tier. Existing Tower faction normalization, reinforced role, depth scaling, anti-faction weapon bonus, faction cape, resilience, masteries and two-potion cap remain live. No production balance or weapon value is modified.");

    expect(rows.length).toBeGreaterThan(0);
    expect(factionTierSummary.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.calibration === "tier_only_control")).toBe(true);
    expect(rows.some((row) => row.calibration === "faction_tier_candidate")).toBe(true);
  }, 300_000);
});
