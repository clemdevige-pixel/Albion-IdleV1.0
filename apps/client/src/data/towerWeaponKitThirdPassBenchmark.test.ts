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
const daggerSustainOverride = vi.hoisted(() => ({
  disableForCurrentRun: false,
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
  const originalAbility = actual.FACTION_ARTIFACT_ABILITIES.whisperingUndeadArrows;
  const tunedAbility = {
    ...originalAbility,
    mechanics: {
      ...originalAbility.mechanics,
      mechanics: originalAbility.mechanics.mechanics.filter(
        (mechanic: any) => mechanic.effectId !== "effect_bow_whispering_vulnerability",
      ),
    },
  };
  return {
    ...actual,
    FACTION_ARTIFACT_ABILITIES: {
      ...actual.FACTION_ARTIFACT_ABILITIES,
      whisperingUndeadArrows: tunedAbility,
    },
    FACTION_ARTIFACT_WEAPON_CONTENT: actual.FACTION_ARTIFACT_WEAPON_CONTENT.map((entry: any) => (
      entry.specializationName === "Whispering Bow"
        ? { ...entry, signatureAbility: tunedAbility }
        : entry
    )),
  };
});

vi.mock("./weaponContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<WeaponContentSurface>();
  return {
    ...actual,
    resolveUnlockedWeaponAbilities: (weaponItemId: string, familyMasteryLevel: number) => {
      const abilities = actual.resolveUnlockedWeaponAbilities(weaponItemId, familyMasteryLevel);
      if (!daggerSustainOverride.disableForCurrentRun || !weaponItemId.includes("dagger_")) return abilities;
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
const TRIAL_SEED = "tower-weapon-kit-third-pass-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
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
  ability_bow_badon_raging_storm: 1.05 / 1.35,
  ability_dagger_demonfang_blood_ritual: 1.15 / 2.0,
  ability_dagger_claws_disembowel: 0.90 / 1.4,
  ability_fire_blazing_flame_tornado: 1.35 / 1.5,
  ability_fire_great_pyroblast: 3.0 / 2.0,
  ability_gloves_battle_bracers_falcon_smash: 3.5 / 2.6,
};
const EFFECT_DAMAGE_TUNING_BY_WEAPON: Readonly<Record<string, number>> = {
  "Claws": 0.10 / 0.15,
};
const URSINE_DIRECT_MULTIPLIER = (1.8 + 2.0) / (1.8 + 1.65);
const MAIN_NO_SUSTAIN_WEAPONS = new Set(["Demonfang", "Claws"]);

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

function runWeaponBlock(
  block: BenchmarkBlock,
  weapon: BenchmarkSpec,
  seed: string,
  options?: {
    readonly forceDisableDaggerSustain?: boolean;
    readonly forceEnableDaggerSustain?: boolean;
    readonly labelSuffix?: string;
  },
) {
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
    scaleProfile(entry.combatProfile, FACTION_TIER_MULTIPLIER[faction][tier])
  ));

  const abilityTuning = { ...DIRECT_ABILITY_TUNING } as Record<string, number>;
  if (weapon.label === "Ursine Maulers") {
    abilityTuning.ability_gloves_ursine_hundred_fists = URSINE_DIRECT_MULTIPLIER;
  }
  const effectDamageMultiplier = EFFECT_DAMAGE_TUNING_BY_WEAPON[weapon.label] ?? 1;
  const disableSustain = options?.forceEnableDaggerSustain === true
    ? false
    : options?.forceDisableDaggerSustain === true || MAIN_NO_SUSTAIN_WEAPONS.has(weapon.label);
  daggerSustainOverride.disableForCurrentRun = disableSustain;

  try {
    const result = runCombatRuntimeBenchmark({
      label: `tower_weapon_third_pass_${weapon.label.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}_${String(block.blockIndex + 1)}${options?.labelSuffix ?? ""}`,
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
        effectDamageMultiplier,
      },
    });
    return {
      tier,
      faction,
      family: weapon.family,
      weapon: weapon.label,
      matchup,
      clear: result.clear,
      hpPct: result.hpPercent,
      damageReceived: result.damageReceived,
      potionsUsed: result.potionsUsed,
      block: block.blockIndex + 1,
      floorEnd: block.floorEnd,
      failedFloor: result.clear ? null : block.floorStart + result.encounterReached - 1,
      failedFloorProgressPct: result.clear ? 100 : result.encounterProgressPercent,
    };
  } finally {
    towerProfileOverride.profiles = undefined;
    daggerSustainOverride.disableForCurrentRun = false;
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

function runDeathgiversSustainDiagnostic() {
  const deathgivers = ARTIFACT_WEAPON_BENCHMARK_SPECS.find((weapon) => weapon.label === "Deathgivers");
  if (deathgivers === undefined) throw new Error("Missing Deathgivers benchmark spec");
  const scopedBlocks = allBlocks().filter(({ block }) => block.tier >= 6);
  return ([
    { variant: "with_sustain", disable: false },
    { variant: "no_sustain", disable: true },
  ] as const).flatMap((variant) => TIERS.filter((tier) => tier >= 6).map((tier) => {
    const rows = scopedBlocks
      .filter(({ block }) => block.tier === tier)
      .map(({ block, seed }) => runWeaponBlock(block, deathgivers, seed, {
        forceDisableDaggerSustain: variant.disable,
        forceEnableDaggerSustain: !variant.disable,
        labelSuffix: `_${variant.variant}`,
      }));
    const favorable = rows.filter((row) => row.matchup === "favorable");
    const favorableClears = favorable.filter((row) => row.clear);
    const neutral = rows.filter((row) => row.matchup === "neutral");
    const neutralClears = neutral.filter((row) => row.clear);
    return {
      variant: variant.variant,
      tier,
      favorableRuns: favorable.length,
      favorableClears: favorableClears.length,
      favorableClearRatePct: Number(((favorableClears.length / favorable.length) * 100).toFixed(1)),
      avgFavorableClearHpPct: favorableClears.length === 0 ? 0 : Number((favorableClears.reduce((sum, row) => sum + row.hpPct, 0) / favorableClears.length).toFixed(1)),
      neutralRuns: neutral.length,
      neutralClears: neutralClears.length,
      neutralLeakRatePct: Number(((neutralClears.length / neutral.length) * 100).toFixed(1)),
    };
  }));
}

function runDemonfangClawsSustainDiagnostic() {
  const labels = ["Demonfang", "Claws"] as const;
  return labels.flatMap((label) => {
    const weapon = ARTIFACT_WEAPON_BENCHMARK_SPECS.find((entry) => entry.label === label);
    if (weapon === undefined) throw new Error(`Missing ${label} benchmark spec`);
    return ([
      { variant: "with_sustain", disable: false },
      { variant: "no_sustain", disable: true },
    ] as const).flatMap((variant) => TIERS.filter((tier) => tier >= 6).map((tier) => {
      const rows = allBlocks()
        .filter(({ block }) => block.tier === tier)
        .map(({ block, seed }) => runWeaponBlock(block, weapon, seed, {
          forceDisableDaggerSustain: variant.disable,
          forceEnableDaggerSustain: !variant.disable,
          labelSuffix: `_${variant.variant}`,
        }));
      const neutral = rows.filter((row) => row.matchup === "neutral");
      const neutralClears = neutral.filter((row) => row.clear);
      const favorable = rows.filter((row) => row.matchup === "favorable");
      const favorableClears = favorable.filter((row) => row.clear);
      return {
        weapon: label,
        variant: variant.variant,
        tier,
        favorableClearRatePct: Number(((favorableClears.length / favorable.length) * 100).toFixed(1)),
        avgFavorableClearHpPct: favorableClears.length === 0 ? 0 : Number((favorableClears.reduce((sum, row) => sum + row.hpPct, 0) / favorableClears.length).toFixed(1)),
        neutralLeakRatePct: Number(((neutralClears.length / neutral.length) * 100).toFixed(1)),
      };
    }));
  });
}

describe("Tower weapon kit third-pass benchmark", () => {
  it("tests third-pass weapon tuning and dagger sustain removal together", () => {
    const rows = runAll();
    const favorable = summarizeWeaponTier(rows, "favorable");
    const favorableFailures = rows.filter((row) => row.matchup === "favorable" && !row.clear);
    const neutralLeaksByTier = summarizeNeutralLeaks(rows);
    const neutralLeakWeapons = summarizeWeaponTier(rows, "neutral").filter((row) => row.clears > 0);
    const deathgiversSustain = runDeathgiversSustainDiagnostic();
    const demonfangClawsSustain = runDemonfangClawsSustainDiagnostic();

    console.log("[TOWER_WEAPON_THIRD_PASS_FAVORABLE_WEAPON_TIER]");
    console.table(favorable);
    console.log("[TOWER_WEAPON_THIRD_PASS_FAVORABLE_FAILURES]");
    console.table(favorableFailures);
    console.log("[TOWER_WEAPON_THIRD_PASS_NEUTRAL_LEAKS_BY_TIER]");
    console.table(neutralLeaksByTier);
    console.log("[TOWER_WEAPON_THIRD_PASS_NEUTRAL_LEAK_WEAPONS]");
    console.table(neutralLeakWeapons);
    console.log("[TOWER_DEATHGIVERS_DAGGER_SUSTAIN_DIAGNOSTIC]");
    console.table(deathgiversSustain);
    console.log("[TOWER_DEMONFANG_CLAWS_DAGGER_SUSTAIN_DIAGNOSTIC]");
    console.table(demonfangClawsSustain);
    console.log("[TOWER_WEAPON_THIRD_PASS_NOTE] Benchmark-only. Badon 1.05; Demonfang 1.15x3 and no shared dagger sustain; Claws 0.90x4 + bleed 0.10 and no shared dagger sustain; Blazing 1.35x3; Great Fire 3.0; Battle Bracers 3.5; Ursine finisher 2.0; Whispering removes only +15% damage-taken vulnerability. Bloodletter remains unchanged. Deathgivers is A/B tested with and without shared dagger sustain. No production data changed.");

    expect(rows.length).toBeGreaterThan(0);
    expect(favorable.length).toBeGreaterThan(0);
    expect(deathgiversSustain.length).toBe(6);
    expect(demonfangClawsSustain.length).toBe(12);
  }, 300_000);
});
