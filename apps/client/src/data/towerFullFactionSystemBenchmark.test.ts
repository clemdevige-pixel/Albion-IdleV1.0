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
const TRIAL_SEED = "tower-full-system-trial";

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

function runWeaponBlock(
  block: BenchmarkBlock,
  weapon: BenchmarkSpec,
  towerSeed: string,
  sampleId: string,
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
  if (resolvedFloors.some((entry) => (
    entry.floorDefinition.block.factionId !== block.factionId
    || entry.floorDefinition.block.tier !== tier
  ))) {
    throw new Error(`Resolved Tower floors drifted outside block ${block.id}`);
  }

  towerProfileOverride.profiles = resolvedFloors.map((entry) => entry.combatProfile);
  try {
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

    const floorRows = result.encounters.map((encounter, index) => ({
      sampleId,
      source: block.source,
      block: block.blockIndex + 1,
      tier,
      faction: block.factionId,
      family: weapon.family,
      weapon: weapon.label,
      matchup,
      floor: floors[index] ?? block.floorStart + index,
      role: resolvedFloors[index]?.floorDefinition.role ?? "unknown",
      clear: encounter.cleared,
      hpAfterPct: encounter.hpAfterPercent,
      enemyHpRemainingPct: encounter.enemyHpRemainingPercent,
      encounterProgressPct: encounter.encounterProgressPercent,
      potionsUsed: encounter.potionsUsed,
      seconds: encounter.seconds,
      dps: encounter.observedDps,
      incomingDps: encounter.incomingDps,
    }));

    return {
      blockRow: {
        sampleId,
        source: block.source,
        block: block.blockIndex + 1,
        floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
        tier,
        faction: block.factionId,
        family: weapon.family,
        weapon: weapon.label,
        matchup,
        outgoingBonusPct: modifiers.outgoingDamageBonusPercent,
        resilienceMultiplier: modifiers.factionResilienceDamageMultiplier,
        capeReductionPct: result.dungeonDamageReductionPercent,
        clear: result.clear,
        hpPct: result.hpPercent,
        potions: result.potionsUsed,
        encounterReached: result.encounterReached,
        failedFloor: result.clear ? null : block.floorStart + result.encounterReached - 1,
        failedFloorProgressPct: result.clear ? 100 : result.encounterProgressPercent,
        seconds: result.seconds,
        dps: result.observedDps,
        incomingDps: result.incomingDps,
      },
      floorRows,
    };
  } finally {
    towerProfileOverride.profiles = undefined;
  }
}

type BlockRow = ReturnType<typeof runWeaponBlock>["blockRow"];
type FloorRow = ReturnType<typeof runWeaponBlock>["floorRows"][number];

function runBlocks(blocks: readonly BenchmarkBlock[], towerSeed: string, prefix: string) {
  return blocks.flatMap((block) => ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => (
    runWeaponBlock(
      block,
      weapon,
      towerSeed,
      `${prefix}_block_${String(block.blockIndex + 1)}`,
    )
  )));
}

function summarizeFavorableByWeaponTier(rows: readonly BlockRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => (
    [4, 5, 6, 7, 8].map((tier) => {
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
        blocks: scoped.length,
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
    })
  )).filter((row) => row !== undefined);
}

function summarizeNeutralByWeaponTier(rows: readonly BlockRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => (
    [4, 5, 6, 7, 8].map((tier) => {
      const scoped = rows.filter((row) => (
        row.family === weapon.family
        && row.weapon === weapon.label
        && row.tier === tier
        && row.matchup === "neutral"
      ));
      if (scoped.length === 0) return undefined;
      const clears = scoped.filter((row) => row.clear);
      return {
        family: weapon.family,
        weapon: weapon.label,
        tier,
        blocks: scoped.length,
        clears: clears.length,
        clearRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
        avgClearHpPct: clears.length === 0
          ? 0
          : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
        deepestClearedFloor: clears.length === 0
          ? null
          : Math.max(...clears.map((row) => Number(row.floors.split("-")[1]))),
      };
    })
  )).filter((row) => row !== undefined);
}

function summarizeFavorableFloors(rows: readonly FloorRow[]) {
  const favorableRows = rows.filter((row) => row.matchup === "favorable");
  const clears = favorableRows.filter((row) => row.clear);
  return {
    floorsObserved: favorableRows.length,
    clears: clears.length,
    failures: favorableRows.length - clears.length,
    avgHpAfterClearPct: clears.length === 0
      ? 0
      : Number((clears.reduce((sum, row) => sum + row.hpAfterPct, 0) / clears.length).toFixed(1)),
    worstHpAfterClearPct: clears.length === 0
      ? 0
      : Number(Math.min(...clears.map((row) => row.hpAfterPct)).toFixed(1)),
  };
}

describe("Tower full faction system benchmark", () => {
  it("benchmarks every artifact weapon across Trial and deterministic Endless with all live faction modifiers", () => {
    const trialRuns = runBlocks(
      TOWER_TRIAL_BLOCKS.map((block) => ({ ...block, source: "trial" })),
      TRIAL_SEED,
      "tower_full_trial",
    );
    const endlessRuns = ENDLESS_SEEDS.flatMap((seed) => {
      const blocks = getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed);
      return runBlocks(blocks, seed, `tower_full_endless_${seed}`);
    });
    const runs = [...trialRuns, ...endlessRuns];
    const blockRows = runs.map((run) => run.blockRow);
    const floorRows = runs.flatMap((run) => run.floorRows);

    const favorableRows = blockRows.filter((row) => row.matchup === "favorable");
    const neutralRows = blockRows.filter((row) => row.matchup === "neutral");
    const favorableFailures = favorableRows.filter((row) => !row.clear);
    const neutralClears = neutralRows.filter((row) => row.clear);
    const favorableSummary = summarizeFavorableByWeaponTier(blockRows);
    const neutralSummary = summarizeNeutralByWeaponTier(blockRows);
    const favorableFloorSummary = summarizeFavorableFloors(floorRows);

    console.log("[TOWER_FULL_FACTION_FAVORABLE_WEAPON_TIER_SUMMARY]");
    console.table(favorableSummary);
    console.log("[TOWER_FULL_FACTION_FAVORABLE_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_FULL_FACTION_FAVORABLE_FLOOR_SUMMARY]");
    console.table([favorableFloorSummary]);
    console.log("[TOWER_FULL_FACTION_NEUTRAL_WEAPON_TIER_SUMMARY]");
    console.table(neutralSummary);
    console.log("[TOWER_FULL_FACTION_NEUTRAL_BLOCK_CLEARS]");
    console.table(neutralClears);
    console.log("[TOWER_FULL_FACTION_NOTE] Every block uses its real five resolveTowerEncounter() profiles, preserving Tower faction normalization, reinforced roles and depth scaling. Each artifact weapon uses the matching faction cape. Favorable rows receive authored anti-faction damage and matched-weapon resilience ignore; neutral rows receive no weapon bonus and full Tower faction resilience. HP, cooldowns and the two-potion cap persist across the five floors of each block.");

    expect(blockRows.length).toBeGreaterThan(0);
    expect(floorRows.length).toBeGreaterThan(0);
    expect(favorableRows.length).toBeGreaterThan(0);
    expect(neutralRows.length).toBeGreaterThan(0);
    expect(favorableRows.every((row) => row.outgoingBonusPct > 0)).toBe(true);
    expect(favorableRows.every((row) => row.resilienceMultiplier === 0.9)).toBe(true);
    expect(neutralRows.every((row) => row.outgoingBonusPct === 0)).toBe(true);
    expect(neutralRows.every((row) => row.resilienceMultiplier === 0.6)).toBe(true);
    expect(blockRows.every((row) => row.capeReductionPct > 0)).toBe(true);
  }, 180_000);
});
