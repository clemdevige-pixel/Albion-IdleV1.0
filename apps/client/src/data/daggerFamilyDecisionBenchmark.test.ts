import { describe, expect, it, vi } from "vitest";
import { getWorldTierTransitionContract, TOWER_TRIAL_BLOCKS } from "@game/data";
import { getTowerBlocks, type TowerBlockDefinition } from "@game/gameplay";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";
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

const DAGGER_PAIR_BY_TIER = {
  4: "item_weapon_dagger_t4_pair",
  5: "item_weapon_dagger_t5_pair",
  6: "item_weapon_dagger_t6_pair",
  7: "item_weapon_dagger_t7_pair",
} as const;
const WALL_ZONE_BY_TIER = {
  4: WORLD_ZONE_IDS.mountain,
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
} as const;
const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
} as const;
type WorldTier = keyof typeof DAGGER_PAIR_BY_TIER;

function runPair(tier: WorldTier, enchantment: 2 | 3, useHealthPotions: boolean) {
  const contract = getWorldTierTransitionContract(tier);
  return runCombatRuntimeBenchmark({
    label: `dagger_pair_live_validation_t${String(tier)}_${String(enchantment)}_${useHealthPotions ? "potion" : "no_potion"}`,
    weaponItemId: DAGGER_PAIR_BY_TIER[tier],
    zoneDefId: WALL_ZONE_BY_TIER[tier],
    segmentIndex: 9,
    equipmentItemIds: ARMOR_BY_TIER[tier],
    masteryLevel: contract.masteryLevel,
    enchantment,
    useHealthPotions,
  });
}

const ENDLESS_SEEDS = [
  "tower-benchmark-alpha",
  "tower-benchmark-beta",
  "tower-benchmark-gamma",
  "tower-benchmark-delta",
] as const;
const TRIAL_SEED = "dagger-family-live-validation-trial";
const DAGGER_SPECS = ARTIFACT_WEAPON_BENCHMARK_SPECS.filter((spec) => spec.family === "dagger");
type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type BenchmarkBlock = Pick<TowerBlockDefinition, "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source">;
type FactionId = "keeper" | "heretic" | "undead" | "morgana";

function isTier(tier: number): tier is ArtifactBenchmarkTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}
function isFaction(value: string): value is FactionId {
  return value === "keeper" || value === "heretic" || value === "undead" || value === "morgana";
}
function dungeonFor(block: BenchmarkBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId);
  if (dungeon === undefined) throw new Error(`Missing dungeon source for ${block.id}`);
  return dungeon;
}
function allBlocks(): readonly { readonly block: BenchmarkBlock; readonly seed: string }[] {
  const trial = TOWER_TRIAL_BLOCKS.map((block) => ({ block: { ...block, source: "trial" as const }, seed: TRIAL_SEED }));
  const endless = ENDLESS_SEEDS.flatMap((seed) => getTowerBlocks(TOWER_TRIAL_BLOCKS.length, 20, seed).map((block) => ({ block, seed })));
  return [...trial, ...endless];
}
function runArtifactBlock(block: BenchmarkBlock, weapon: BenchmarkSpec, seed: string) {
  if (!isTier(block.tier) || !isFaction(block.factionId)) return undefined;
  const tier = block.tier;
  const faction = block.factionId;
  const dungeon = dungeonFor(block);
  const weaponItemId = weapon.itemId(tier);
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId, capeItemId: `item_cape_t${String(tier)}_${faction}` },
    { factionId: faction, tier, activity: "tower" },
  );
  if (modifiers.outgoingDamageBonusPercent <= 0) return undefined;
  towerProfileOverride.profiles = Array.from(
    { length: block.floorEnd - block.floorStart + 1 },
    (_, index) => resolveTowerEncounter(block.floorStart + index, seed).combatProfile,
  );
  try {
    const result = runCombatRuntimeBenchmark({
      label: `dagger_live_${weapon.label.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}`,
      weaponItemId,
      equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, dungeon.faction),
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      dungeonDefinitionId: dungeon.id,
      enchantment: 3,
      familyMasteryLevel: 75,
      specializationMasteryLevel: 45,
      siblingSpecializationMasteryLevel: 45,
      heroDamageMultiplier: (1 + modifiers.outgoingDamageBonusPercent / 100) * modifiers.factionResilienceDamageMultiplier,
      useHealthPotions: true,
      healthPotionQuantity: 2,
    });
    return { weapon: weapon.label, tier, clear: result.clear, hpPct: result.hpPercent };
  } finally {
    towerProfileOverride.profiles = undefined;
  }
}

describe("Dagger family live validation", () => {
  it("validates Dagger Pair across canonical World walls", () => {
    const rows = ([4, 5, 6, 7] as const).flatMap((tier) => {
      const contract = getWorldTierTransitionContract(tier);
      const scenarios = [
        { scenario: ".2+potion", enchantment: contract.blockedEnchantment, useHealthPotions: true },
        { scenario: ".3-no-potion", enchantment: contract.requiredEnchantment, useHealthPotions: false },
        { scenario: ".3+potion", enchantment: contract.requiredEnchantment, useHealthPotions: true },
      ] as const;
      return scenarios.map((scenario) => {
        const result = runPair(tier, scenario.enchantment, scenario.useHealthPotions);
        return {
          tier,
          scenario: scenario.scenario,
          clear: result.clear,
          hpPct: result.hpPercent,
          observedDps: result.observedDps,
          damageDealt: Math.round(result.damageDealt),
          damageReceived: Math.round(result.damageReceived),
        };
      });
    });
    console.log("[DAGGER_PAIR_LIVE_WORLD]");
    console.table(rows);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("validates artifact daggers on favorable Tower matchups with live authored values", () => {
    const rows = allBlocks().flatMap(({ block, seed }) => DAGGER_SPECS.map((weapon) => runArtifactBlock(block, weapon, seed)).filter((row) => row !== undefined));
    const summary = DAGGER_SPECS.flatMap((weapon) => ([4, 5, 6, 7, 8] as const).map((tier) => {
      const scoped = rows.filter((row) => row.weapon === weapon.label && row.tier === tier);
      if (scoped.length === 0) return undefined;
      const clears = scoped.filter((row) => row.clear);
      return {
        weapon: weapon.label,
        tier,
        runs: scoped.length,
        clearRatePct: Number(((clears.length / scoped.length) * 100).toFixed(1)),
        avgHpPct: clears.length === 0 ? 0 : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
        worstHpPct: clears.length === 0 ? 0 : Number(Math.min(...clears.map((row) => row.hpPct)).toFixed(1)),
      };
    })).filter((row) => row !== undefined);
    console.log("[DAGGER_ARTIFACT_LIVE_SUMMARY]");
    console.table(summary);
    expect(rows.length).toBeGreaterThan(0);
  }, 300_000);
});
