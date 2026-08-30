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
  readonly resolveDungeonCombatProfile: (input: DungeonCombatProfileInput) => AuthoredEnemyCombatProfile;
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
import { applyTowerFactionCombatNormalization } from "./towerCombatNormalization.js";
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
const TRIAL_SEED = "tower-endless-live-validation-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];

type FactionId = "keeper" | "heretic" | "undead" | "morgana";
type Matchup = "favorable" | "neutral";
type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type BenchmarkBlock = Pick<TowerBlockDefinition, "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source">;

function isTier(tier: number): tier is ArtifactBenchmarkTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}
function isFaction(value: string): value is FactionId {
  return value === "keeper" || value === "heretic" || value === "undead" || value === "morgana";
}
function dungeonFor(block: BenchmarkBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing dungeon source for ${block.id}`);
  return dungeon;
}

function runWeaponBlock(block: BenchmarkBlock, weapon: BenchmarkSpec, seed: string) {
  if (!isTier(block.tier) || !isFaction(block.factionId)) throw new Error(`Unsupported block ${block.id}`);
  const tier = block.tier;
  const faction = block.factionId;
  const dungeon = dungeonFor(block);
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

  const floors = Array.from({ length: block.floorEnd - block.floorStart + 1 }, (_, i) => block.floorStart + i);
  const resolved = floors.map((floor) => resolveTowerEncounter(floor, seed));
  towerProfileOverride.profiles = resolved.map((entry) => applyTowerFactionCombatNormalization(
    { factionId: faction, tier },
    entry.combatProfile,
  ));

  try {
    const result = runCombatRuntimeBenchmark({
      label: `tower_live_validation_${weapon.label.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}_${String(block.blockIndex + 1)}`,
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
      faction,
      family: weapon.family,
      weapon: weapon.label,
      matchup,
      clear: result.clear,
      hpPct: result.hpPercent,
      block: block.blockIndex + 1,
      failedFloor: result.clear ? null : block.floorStart + result.encounterReached - 1,
      failedFloorProgressPct: result.clear ? 100 : result.encounterProgressPercent,
    };
  } finally {
    towerProfileOverride.profiles = undefined;
  }
}

type Row = ReturnType<typeof runWeaponBlock>;

function allBlocks(): readonly { readonly block: BenchmarkBlock; readonly seed: string }[] {
  const trial = TOWER_TRIAL_BLOCKS.map((block) => ({ block: { ...block, source: "trial" as const }, seed: TRIAL_SEED }));
  const endless = ENDLESS_SEEDS.flatMap((seed) => (
    getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed).map((block) => ({ block, seed }))
  ));
  return [...trial, ...endless];
}
function runAll(): Row[] {
  return allBlocks().flatMap(({ block, seed }) => (
    ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => runWeaponBlock(block, weapon, seed))
  ));
}
function summarizeWeaponTier(rows: readonly Row[], matchup: Matchup) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => TIERS.map((tier) => {
    const scoped = rows.filter((row) => row.weapon === weapon.label && row.tier === tier && row.matchup === matchup);
    if (scoped.length === 0) return undefined;
    const clears = scoped.filter((row) => row.clear);
    return {
      weapon: weapon.label,
      tier,
      runs: scoped.length,
      clears: clears.length,
      failures: scoped.length - clears.length,
      clearRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
      avgClearHpPct: clears.length === 0 ? 0 : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
      worstClearHpPct: clears.length === 0 ? 0 : Number(Math.min(...clears.map((row) => row.hpPct)).toFixed(1)),
    };
  })).filter((row) => row !== undefined);
}
function summarizeNeutralLeaks(rows: readonly Row[]) {
  return TIERS.map((tier) => {
    const scoped = rows.filter((row) => row.tier === tier && row.matchup === "neutral");
    const clears = scoped.filter((row) => row.clear);
    return {
      tier,
      runs: scoped.length,
      clears: clears.length,
      leakRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
    };
  });
}

describe("Tower Endless live-authored balance validation", () => {
  it("validates the authored live data without benchmark-only weapon tuning", () => {
    const rows = runAll();
    const favorable = summarizeWeaponTier(rows, "favorable");
    const favorableFailures = rows.filter((row) => row.matchup === "favorable" && !row.clear);
    const neutralLeaks = summarizeNeutralLeaks(rows);
    const neutralLeakWeapons = summarizeWeaponTier(rows, "neutral").filter((row) => row.clears > 0);
    const t8 = favorable.filter((row) => row.tier === 8);
    const daggers = favorable.filter((row) => (
      row.weapon === "Bloodletter"
      || row.weapon === "Demonfang"
      || row.weapon === "Deathgivers"
      || row.weapon === "Claws"
    ));

    console.log("[TOWER_LIVE_VALIDATION_FAVORABLE]");
    console.table(favorable);
    console.log("[TOWER_LIVE_VALIDATION_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_LIVE_VALIDATION_NEUTRAL_LEAKS]");
    console.table(neutralLeaks);
    console.log("[TOWER_LIVE_VALIDATION_NEUTRAL_LEAK_WEAPONS]");
    console.table(neutralLeakWeapons);
    console.log("[TOWER_LIVE_VALIDATION_T8]");
    console.table(t8);
    console.log("[TOWER_LIVE_VALIDATION_DAGGERS]");
    console.table(daggers);
    console.log("[TOWER_LIVE_VALIDATION_NOTE] Uses authored live Tower normalization and authored live weapon abilities. No benchmark-only damage tuning or weapon mocks are applied.");

    expect(rows.length).toBeGreaterThan(0);
    expect(favorable.length).toBeGreaterThan(0);
  }, 300_000);
});
