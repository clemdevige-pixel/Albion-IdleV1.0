import { describe, expect, it, vi } from "vitest";
import { getWorldTierTransitionContract, TOWER_TRIAL_BLOCKS } from "@game/data";
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
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const DAGGER_PAIR_DAMAGE_MULTIPLIER = 1.095;
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

function runDaggerPairWall(tier: WorldTier, enchantment: 2 | 3, useHealthPotions: boolean) {
  const contract = getWorldTierTransitionContract(tier);
  return runCombatRuntimeBenchmark({
    label: `dagger_pair_final_calibration_t${String(tier)}_${String(enchantment)}_${useHealthPotions ? "potion" : "no_potion"}`,
    weaponItemId: DAGGER_PAIR_BY_TIER[tier],
    zoneDefId: WALL_ZONE_BY_TIER[tier],
    segmentIndex: 9,
    equipmentItemIds: ARMOR_BY_TIER[tier],
    masteryLevel: contract.masteryLevel,
    enchantment,
    useHealthPotions,
    heroDamageMultiplier: DAGGER_PAIR_DAMAGE_MULTIPLIER,
  });
}

const ENDLESS_SEEDS = [
  "tower-benchmark-alpha",
  "tower-benchmark-beta",
  "tower-benchmark-gamma",
  "tower-benchmark-delta",
] as const;
const TRIAL_SEED = "dagger-final-calibration-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
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
function signatureAbility(result: ReturnType<typeof runCombatRuntimeBenchmark>) {
  return result.abilities.find((ability) => (
    ability.abilityId !== "ability_dagger_double_slash"
    && ability.abilityId !== "ability_dagger_flurry"
  ));
}
function runDaggerTowerBlock(block: BenchmarkBlock, weapon: BenchmarkSpec, seed: string) {
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
  if (modifiers.outgoingDamageBonusPercent <= 0) return undefined;
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );
  const floors = Array.from({ length: block.floorEnd - block.floorStart + 1 }, (_, index) => block.floorStart + index);
  towerProfileOverride.profiles = floors.map((floor) => resolveTowerEncounter(floor, seed).combatProfile);
  try {
    const result = runCombatRuntimeBenchmark({
      label: `dagger_final_tower_${weapon.label.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}_${String(block.blockIndex + 1)}`,
      weaponItemId,
      equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, dungeon.faction),
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      dungeonDefinitionId: dungeon.id,
      enchantment: 3,
      familyMasteryLevel: 75,
      specializationMasteryLevel: 45,
      siblingSpecializationMasteryLevel: 45,
      heroDamageMultiplier,
      useHealthPotions: true,
      healthPotionQuantity: 2,
    });
    const signature = signatureAbility(result);
    return {
      weapon: weapon.label,
      tier,
      clear: result.clear,
      hpPct: result.hpPercent,
      totalDamage: Math.round(result.damageDealt),
      signatureId: signature?.abilityId ?? "missing",
      signatureCasts: signature?.casts ?? 0,
      signatureDamage: Math.round(signature?.totalDamage ?? 0),
      signatureSharePct: result.damageDealt <= 0 ? 0 : Number((((signature?.totalDamage ?? 0) / result.damageDealt) * 100).toFixed(1)),
    };
  } finally {
    towerProfileOverride.profiles = undefined;
  }
}

function allBlocks(): readonly { readonly block: BenchmarkBlock; readonly seed: string }[] {
  const trial = TOWER_TRIAL_BLOCKS.map((block) => ({ block: { ...block, source: "trial" as const }, seed: TRIAL_SEED }));
  const endless = ENDLESS_SEEDS.flatMap((seed) => getTowerBlocks(TOWER_TRIAL_BLOCKS.length, 20, seed).map((block) => ({ block, seed })));
  return [...trial, ...endless];
}

describe("Dagger family final calibration benchmark", () => {
  it("tests the calculated Dagger Pair base-damage candidate across canonical World walls", () => {
    const rows = ([4, 5, 6, 7] as const).flatMap((tier) => {
      const contract = getWorldTierTransitionContract(tier);
      const scenarios = [
        { scenario: ".2+potion", enchantment: contract.blockedEnchantment, useHealthPotions: true },
        { scenario: ".3-no-potion", enchantment: contract.requiredEnchantment, useHealthPotions: false },
        { scenario: ".3+potion", enchantment: contract.requiredEnchantment, useHealthPotions: true },
      ] as const;
      return scenarios.map((scenario) => {
        const result = runDaggerPairWall(tier, scenario.enchantment, scenario.useHealthPotions);
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
    console.log("[DAGGER_PAIR_BASE_DAMAGE_CANDIDATE_WORLD]");
    console.table(rows);
    const blocked = rows.filter((row) => row.scenario !== ".3+potion");
    const required = rows.filter((row) => row.scenario === ".3+potion");
    expect(blocked.filter((row) => row.clear)).toHaveLength(0);
    expect(required.filter((row) => row.clear)).toHaveLength(required.length);
  });

  it("measures current artifact dagger signature contribution on favorable Tower matchups", () => {
    const rows = allBlocks().flatMap(({ block, seed }) => DAGGER_SPECS.map((weapon) => runDaggerTowerBlock(block, weapon, seed)).filter((row) => row !== undefined));
    console.log("[DAGGER_ARTIFACT_SIGNATURE_CONTRIBUTION]");
    console.table(rows);

    const summary = DAGGER_SPECS.flatMap((weapon) => TIERS.map((tier) => {
      const scoped = rows.filter((row) => row.weapon === weapon.label && row.tier === tier);
      if (scoped.length === 0) return undefined;
      const avg = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
      return {
        weapon: weapon.label,
        tier,
        runs: scoped.length,
        clearRatePct: Number(((scoped.filter((row) => row.clear).length / scoped.length) * 100).toFixed(1)),
        avgHpPct: Number(avg(scoped.map((row) => row.hpPct)).toFixed(1)),
        avgSignatureSharePct: Number(avg(scoped.map((row) => row.signatureSharePct)).toFixed(1)),
        avgSignatureDamage: Math.round(avg(scoped.map((row) => row.signatureDamage))),
        avgSignatureCasts: Number(avg(scoped.map((row) => row.signatureCasts)).toFixed(1)),
      };
    })).filter((row) => row !== undefined);

    console.log("[DAGGER_ARTIFACT_SIGNATURE_SUMMARY]");
    console.table(summary);
    expect(rows.length).toBeGreaterThan(0);
  }, 300_000);
});
