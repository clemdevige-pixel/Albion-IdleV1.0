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
const TRIAL_SEED = "tower-tier-difficulty-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const TOWER_DIFFICULTY_MULTIPLIER_BY_TIER = {
  4: 1.5,
  5: 1.5,
  6: 1.55,
  7: 1.65,
  8: 1.15,
} as const satisfies Readonly<Record<ArtifactBenchmarkTier, number>>;

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
) {
  if (!isArtifactBenchmarkTier(block.tier)) {
    throw new Error(`Unsupported Tower benchmark tier T${String(block.tier)} in ${block.id}`);
  }
  const tier = block.tier;
  const tierMultiplier = TOWER_DIFFICULTY_MULTIPLIER_BY_TIER[tier];
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
    scaleTowerProfile(entry.combatProfile, tierMultiplier)
  ));

  try {
    const result = runCombatRuntimeBenchmark({
      label: `tower_tier_t${String(tier)}_${String(block.blockIndex + 1)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
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
      tier,
      tierMultiplier,
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

function runBenchmark(): BenchmarkRow[] {
  const trialRows = TOWER_TRIAL_BLOCKS.flatMap((block) => (
    ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => runWeaponBlock(
      { ...block, source: "trial" },
      weapon,
      TRIAL_SEED,
    ))
  ));
  const endlessRows = ENDLESS_SEEDS.flatMap((seed) => {
    const blocks = getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed);
    return blocks.flatMap((block) => ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => (
      runWeaponBlock(block, weapon, seed)
    )));
  });
  return [...trialRows, ...endlessRows];
}

function summarizeByTier(rows: readonly BenchmarkRow[]) {
  return TIERS.flatMap((tier) => (["favorable", "neutral"] as const).map((matchup) => {
    const scoped = rows.filter((row) => row.tier === tier && row.matchup === matchup);
    const clears = scoped.filter((row) => row.clear);
    return {
      tier,
      multiplier: TOWER_DIFFICULTY_MULTIPLIER_BY_TIER[tier],
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
      deepestClearedFloor: clears.length === 0
        ? null
        : Math.max(...clears.map((row) => row.floorEnd)),
    };
  }));
}

function summarizeFavorableByWeaponTier(rows: readonly BenchmarkRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => TIERS.map((tier) => {
    const scoped = rows.filter((row) => (
      row.family === weapon.family
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
      multiplier: TOWER_DIFFICULTY_MULTIPLIER_BY_TIER[tier],
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

function summarizeFavorableFailures(rows: readonly BenchmarkRow[]) {
  return rows
    .filter((row) => row.matchup === "favorable" && !row.clear)
    .map((row) => ({
      tier: row.tier,
      multiplier: row.tierMultiplier,
      faction: row.faction,
      family: row.family,
      weapon: row.weapon,
      block: row.block,
      failedFloor: row.failedFloor,
      failedFloorProgressPct: row.failedFloorProgressPct,
    }));
}

function summarizeNeutralLeaksByTier(rows: readonly BenchmarkRow[]) {
  return TIERS.map((tier) => {
    const scoped = rows.filter((row) => row.tier === tier && row.matchup === "neutral");
    const clears = scoped.filter((row) => row.clear);
    return {
      tier,
      multiplier: TOWER_DIFFICULTY_MULTIPLIER_BY_TIER[tier],
      neutralRuns: scoped.length,
      neutralClears: clears.length,
      leakRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      deepestClearedFloor: clears.length === 0
        ? null
        : Math.max(...clears.map((row) => row.floorEnd)),
    };
  });
}

function summarizeNeutralLeaksByWeaponTier(rows: readonly BenchmarkRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => TIERS.map((tier) => {
    const scoped = rows.filter((row) => (
      row.family === weapon.family
      && row.weapon === weapon.label
      && row.tier === tier
      && row.matchup === "neutral"
    ));
    if (scoped.length === 0) return undefined;
    const clears = scoped.filter((row) => row.clear);
    if (clears.length === 0) return undefined;
    return {
      family: weapon.family,
      weapon: weapon.label,
      tier,
      multiplier: TOWER_DIFFICULTY_MULTIPLIER_BY_TIER[tier],
      runs: scoped.length,
      clears: clears.length,
      leakRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      avgClearHpPct: Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
      deepestClearedFloor: Math.max(...clears.map((row) => row.floorEnd)),
    };
  })).filter((row) => row !== undefined);
}

describe("Tower tier difficulty tuning benchmark", () => {
  it("tests tier-specific Tower difficulty targets with all live faction modifiers", () => {
    const rows = runBenchmark();
    const tierSummary = summarizeByTier(rows);
    const favorableWeaponTierSummary = summarizeFavorableByWeaponTier(rows);
    const favorableFailures = summarizeFavorableFailures(rows);
    const neutralLeaksByTier = summarizeNeutralLeaksByTier(rows);
    const neutralLeaksByWeaponTier = summarizeNeutralLeaksByWeaponTier(rows);

    console.log("[TOWER_TIER_DIFFICULTY_SUMMARY]");
    console.table(tierSummary);
    console.log("[TOWER_TIER_DIFFICULTY_FAVORABLE_WEAPON_TIER_SUMMARY]");
    console.table(favorableWeaponTierSummary);
    console.log("[TOWER_TIER_DIFFICULTY_FAVORABLE_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_TIER_DIFFICULTY_NEUTRAL_LEAKS_BY_TIER]");
    console.table(neutralLeaksByTier);
    console.log("[TOWER_TIER_DIFFICULTY_NEUTRAL_LEAKS_BY_WEAPON_TIER]");
    console.table(neutralLeaksByWeaponTier);
    console.log("[TOWER_TIER_DIFFICULTY_NOTE] Benchmark-only tier multipliers scale the already-resolved Tower enemy profile uniformly on HP, damage, armor and magic resistance: T4 x1.50, T5 x1.50, T6 x1.55, T7 x1.65, T8 x1.15. Attack speed, faction normalization, floor role, depth scaling, anti-faction weapon bonus, faction cape, resilience, masteries and potion cap remain unchanged. No production balance value is modified.");

    expect(rows.length).toBeGreaterThan(0);
    expect(tierSummary).toHaveLength(TIERS.length * 2);
    expect(rows.some((row) => row.matchup === "favorable")).toBe(true);
    expect(rows.some((row) => row.matchup === "neutral")).toBe(true);
  }, 300_000);
});
