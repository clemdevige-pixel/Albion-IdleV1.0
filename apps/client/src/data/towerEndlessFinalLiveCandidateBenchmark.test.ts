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
interface ArtifactContentSurface {
  readonly FACTION_ARTIFACT_ABILITIES: Record<string, any>;
  readonly FACTION_ARTIFACT_WEAPON_CONTENT: readonly any[];
  readonly [key: string]: unknown;
}
interface WeaponContentSurface {
  readonly resolveUnlockedWeaponAbilities: (weaponItemId: string, familyMasteryLevel: number) => readonly any[];
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

vi.mock("./factionArtifactWeaponContent.js", async (importOriginal) => {
  const actual = await importOriginal<ArtifactContentSurface>();

  const whisperingOriginal = actual.FACTION_ARTIFACT_ABILITIES.whisperingUndeadArrows;
  const whisperingTuned = {
    ...whisperingOriginal,
    mechanics: {
      ...whisperingOriginal.mechanics,
      mechanics: whisperingOriginal.mechanics.mechanics
        .filter((mechanic: any) => mechanic.effectId !== "effect_bow_whispering_vulnerability")
        .map((mechanic: any) => (
          mechanic.kind === "auto_attack_bonus_window"
            ? { ...mechanic, ratio: 0.55 }
            : mechanic
        )),
    },
  };

  const deathgiversOriginal = actual.FACTION_ARTIFACT_ABILITIES.deathgiversGhostStrike;
  const deathgiversTuned = {
    ...deathgiversOriginal,
    mechanics: {
      ...deathgiversOriginal.mechanics,
      mechanics: deathgiversOriginal.mechanics.mechanics.map((mechanic: any) => (
        mechanic.kind === "damage" && mechanic.bonusEffect?.effectId === "effect_dagger_opening"
          ? { ...mechanic, bonusEffect: { ...mechanic.bonusEffect, bonusRatio: 2.2 } }
          : mechanic
      )),
    },
  };

  return {
    ...actual,
    FACTION_ARTIFACT_ABILITIES: {
      ...actual.FACTION_ARTIFACT_ABILITIES,
      whisperingUndeadArrows: whisperingTuned,
      deathgiversGhostStrike: deathgiversTuned,
    },
    FACTION_ARTIFACT_WEAPON_CONTENT: actual.FACTION_ARTIFACT_WEAPON_CONTENT.map((entry: any) => {
      if (entry.specializationName === "Whispering Bow") return { ...entry, signatureAbility: whisperingTuned };
      if (entry.specializationName === "Deathgivers") return { ...entry, signatureAbility: deathgiversTuned };
      return entry;
    }),
  };
});

vi.mock("./weaponContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<WeaponContentSurface>();
  return {
    ...actual,
    resolveUnlockedWeaponAbilities: (weaponItemId: string, familyMasteryLevel: number) => {
      const abilities = actual.resolveUnlockedWeaponAbilities(weaponItemId, familyMasteryLevel);
      if (!weaponItemId.includes("item_weapon_dagger_")) return abilities;
      return abilities.map((ability: any) => {
        if (String(ability.id) !== "ability_dagger_double_slash") return ability;
        return {
          ...ability,
          mechanics: {
            ...ability.mechanics,
            mechanics: ability.mechanics.mechanics.filter((mechanic: any) => mechanic.kind !== "heal_from_damage"),
          },
        };
      });
    },
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
const TRIAL_SEED = "tower-endless-final-live-candidate-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const T8_EXTRA_MULTIPLIER = 1.05;

type FactionId = "keeper" | "heretic" | "undead" | "morgana";
type Matchup = "favorable" | "neutral";
type BenchmarkSpec = (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number];
type BenchmarkBlock = Pick<TowerBlockDefinition, "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source">;

const FACTION_TIER_MULTIPLIER: Readonly<Record<FactionId, Readonly<Record<ArtifactBenchmarkTier, number>>>> = {
  keeper: { 4: 1.5, 5: 1.4, 6: 1.48, 7: 1.5, 8: 1.13 },
  heretic: { 4: 1.45, 5: 1.47, 6: 1.47, 7: 1.58, 8: 1.15 },
  undead: { 4: 1.5, 5: 1.47, 6: 1.55, 7: 1.58, 8: 1.15 },
  morgana: { 4: 1.5, 5: 1.43, 6: 1.48, 7: 1.65, 8: 1.15 },
};

const DIRECT_ABILITY_TUNING: Readonly<Record<string, number>> = {
  ability_sword_galatine_soulless_stream: 2.75 / 2.6,
  ability_bow_badon_raging_storm: 1.05 / 1.35,
  ability_fire_wildfire_magma_sphere: 1.4 / 1.3,
  ability_fire_blazing_flame_tornado: 1.35 / 1.5,
  ability_fire_great_pyroblast: 3.4 / 2.0,
  ability_gloves_battle_bracers_falcon_smash: 3.6 / 2.6,
  ability_dagger_demonfang_blood_ritual: 1.15 / 2.0,
  ability_dagger_claws_disembowel: 1.0 / 1.4,
};
const EFFECT_DAMAGE_TUNING_BY_WEAPON: Readonly<Record<string, number>> = {
  Claws: 0.10 / 0.15,
};
const URSINE_DIRECT_MULTIPLIER = (1.8 + 2.35) / (1.8 + 1.65);

function isTier(tier: number): tier is ArtifactBenchmarkTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}
function isFaction(value: string): value is FactionId {
  return value === "keeper" || value === "heretic" || value === "undead" || value === "morgana";
}
function scaleProfile(profile: AuthoredEnemyCombatProfile, multiplier: number): AuthoredEnemyCombatProfile {
  return {
    hp: Math.round(profile.hp * multiplier),
    damage: Math.round(profile.damage * multiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * multiplier),
    magicResistance: Math.round(profile.magicResistance * multiplier),
  };
}
function dungeonFor(block: BenchmarkBlock) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => (
    entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing dungeon source for ${block.id}`);
  return dungeon;
}
function effectiveTowerMultiplier(faction: FactionId, tier: ArtifactBenchmarkTier): number {
  return FACTION_TIER_MULTIPLIER[faction][tier] * (tier === 8 ? T8_EXTRA_MULTIPLIER : 1);
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
  towerProfileOverride.profiles = resolved.map((entry) => (
    scaleProfile(entry.combatProfile, effectiveTowerMultiplier(faction, tier))
  ));

  const abilityTuning = { ...DIRECT_ABILITY_TUNING } as Record<string, number>;
  if (weapon.label === "Ursine Maulers") {
    abilityTuning.ability_gloves_ursine_hundred_fists = URSINE_DIRECT_MULTIPLIER;
  }

  try {
    const result = runCombatRuntimeBenchmark({
      label: `tower_final_live_candidate_${weapon.label.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}_${String(block.blockIndex + 1)}`,
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
      damageTuning: {
        directAbilityMultiplierById: abilityTuning,
        effectDamageMultiplier: EFFECT_DAMAGE_TUNING_BY_WEAPON[weapon.label] ?? 1,
      },
    });
    const ghostStrike = result.abilities.find((ability) => ability.abilityId === "ability_dagger_deathgivers_ghost_strike");
    const flurry = result.abilities.find((ability) => ability.abilityId === "ability_dagger_flurry");
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
      ghostStrikeCasts: ghostStrike?.casts ?? 0,
      ghostStrikeDamage: ghostStrike?.totalDamage ?? 0,
      flurryCasts: flurry?.casts ?? 0,
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

describe("Tower Endless final live candidate benchmark", () => {
  it("validates the complete candidate before authored live application", () => {
    const rows = runAll();
    const favorable = summarizeWeaponTier(rows, "favorable");
    const favorableFailures = rows.filter((row) => row.matchup === "favorable" && !row.clear);
    const neutralLeaks = summarizeNeutralLeaks(rows);
    const neutralLeakWeapons = summarizeWeaponTier(rows, "neutral").filter((row) => row.clears > 0);
    const t8Favorable = favorable.filter((row) => row.tier === 8);
    const daggerSummary = favorable.filter((row) => (
      row.weapon === "Bloodletter"
      || row.weapon === "Demonfang"
      || row.weapon === "Deathgivers"
      || row.weapon === "Claws"
    ));
    const deathgivers = rows.filter((row) => row.weapon === "Deathgivers" && row.matchup === "favorable").map((row) => ({
      tier: row.tier,
      faction: row.faction,
      clear: row.clear,
      hpPct: row.hpPct,
      ghostStrikeCasts: row.ghostStrikeCasts,
      ghostStrikeDamage: row.ghostStrikeDamage,
      flurryCasts: row.flurryCasts,
    }));

    console.log("[TOWER_FINAL_LIVE_CANDIDATE_FAVORABLE_WEAPON_TIER]");
    console.table(favorable);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_FAVORABLE_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_NEUTRAL_LEAKS_BY_TIER]");
    console.table(neutralLeaks);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_NEUTRAL_LEAK_WEAPONS]");
    console.table(neutralLeakWeapons);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_T8_FAVORABLE]");
    console.table(t8Favorable);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_DAGGER_SUMMARY]");
    console.table(daggerSummary);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_DEATHGIVERS]");
    console.table(deathgivers);
    console.log("[TOWER_FINAL_LIVE_CANDIDATE_NOTE] Full candidate from AI_BIBLE/05_BALANCE/2026-08-30_TOWER_ENDLESS_FINAL_BALANCE_CANDIDATE.md. Tower-only faction×tier normalization; T8 extra x1.05; family-wide dagger sustain removal; all validated artifact weapon adjustments plus final weak-weapon micro-buffs.");

    expect(rows.length).toBeGreaterThan(0);
    expect(favorable).toHaveLength(ARTIFACT_WEAPON_BENCHMARK_SPECS.length * TIERS.length);
  }, 300_000);
});
