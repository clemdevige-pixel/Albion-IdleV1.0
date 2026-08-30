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
      mechanics: whisperingOriginal.mechanics.mechanics.filter(
        (mechanic: any) => mechanic.effectId !== "effect_bow_whispering_vulnerability",
      ),
    },
  };
  const deathgiversOriginal = actual.FACTION_ARTIFACT_ABILITIES.deathgiversGhostStrike;
  const deathgiversTuned = {
    ...deathgiversOriginal,
    mechanics: {
      ...deathgiversOriginal.mechanics,
      mechanics: deathgiversOriginal.mechanics.mechanics.map((mechanic: any) => (
        mechanic.kind === "damage" && mechanic.bonusEffect?.effectId === "effect_dagger_opening"
          ? { ...mechanic, bonusEffect: { ...mechanic.bonusEffect, bonusRatio: 1.8 } }
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
const ENDLESS_SEEDS = ["tower-benchmark-alpha", "tower-benchmark-beta", "tower-benchmark-gamma", "tower-benchmark-delta"] as const;
const TRIAL_SEED = "tower-t8-fine-calibration-trial";
const T8_PRESETS = [1.05, 1.075, 1.10, 1.125, 1.15] as const;
type FactionId = "keeper" | "heretic" | "undead" | "morgana";
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
  ability_dagger_claws_disembowel: 1.0 / 1.4,
  ability_fire_blazing_flame_tornado: 1.35 / 1.5,
  ability_fire_great_pyroblast: 3.3 / 2.0,
  ability_gloves_battle_bracers_falcon_smash: 3.5 / 2.6,
};
const EFFECT_DAMAGE_TUNING_BY_WEAPON: Readonly<Record<string, number>> = { Claws: 0.10 / 0.15 };
const URSINE_DIRECT_MULTIPLIER = (1.8 + 2.25) / (1.8 + 1.65);
const DEATHGIVERS_GHOST_STRIKE_ID = "ability_dagger_deathgivers_ghost_strike";
const DAGGER_FLURRY_ID = "ability_dagger_flurry";

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
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => entry.tier === block.tier && entry.faction.toLowerCase() === block.factionId);
  if (dungeon === undefined) throw new Error(`Missing dungeon source for ${block.id}`);
  return dungeon;
}
function allBlocks(): readonly { readonly block: BenchmarkBlock; readonly seed: string }[] {
  const trial = TOWER_TRIAL_BLOCKS.map((block) => ({ block: { ...block, source: "trial" as const }, seed: TRIAL_SEED }));
  const endless = ENDLESS_SEEDS.flatMap((seed) => getTowerBlocks(TOWER_TRIAL_BLOCKS.length, ENDLESS_BLOCKS_PER_SEED, seed).map((block) => ({ block, seed })));
  return [...trial, ...endless];
}

function runT8Preset(preset: number) {
  return allBlocks().filter(({ block }) => block.tier === 8).flatMap(({ block, seed }) => {
    if (!isTier(block.tier) || !isFaction(block.factionId)) return [];
    const dungeon = dungeonFor(block);
    const tier = block.tier;
    const faction = block.factionId;
    return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
      const weaponItemId = weapon.itemId(tier);
      const capeItemId = `item_cape_t8_${faction}`;
      const modifiers = resolveFactionCombatModifiers(
        { weaponItemId, capeItemId },
        { factionId: faction, tier, activity: "tower" },
      );
      const matchup = modifiers.outgoingDamageBonusPercent > 0 ? "favorable" : "neutral";
      const heroDamageMultiplier = (1 + modifiers.outgoingDamageBonusPercent / 100) * modifiers.factionResilienceDamageMultiplier;
      const floors = Array.from({ length: block.floorEnd - block.floorStart + 1 }, (_, i) => block.floorStart + i);
      const resolved = floors.map((floor) => resolveTowerEncounter(floor, seed));
      towerProfileOverride.profiles = resolved.map((entry) => scaleProfile(entry.combatProfile, FACTION_TIER_MULTIPLIER[faction][tier] * preset));
      const abilityTuning = { ...DIRECT_ABILITY_TUNING } as Record<string, number>;
      if (weapon.label === "Ursine Maulers") abilityTuning.ability_gloves_ursine_hundred_fists = URSINE_DIRECT_MULTIPLIER;
      try {
        const result = runCombatRuntimeBenchmark({
          label: `tower_t8_fine_${String(preset)}_${weapon.label.replaceAll(" ", "_").toLowerCase()}_${String(block.blockIndex + 1)}`,
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
        const ghost = result.abilities.find((ability) => ability.abilityId === DEATHGIVERS_GHOST_STRIKE_ID);
        const flurry = result.abilities.find((ability) => ability.abilityId === DAGGER_FLURRY_ID);
        return {
          preset,
          weapon: weapon.label,
          faction,
          matchup,
          clear: result.clear,
          hpPct: result.hpPercent,
          ghostStrikeCasts: ghost?.casts ?? 0,
          ghostStrikeDamage: ghost?.totalDamage ?? 0,
          flurryCasts: flurry?.casts ?? 0,
          deathgiversEncounterTelemetry: weapon.label === "Deathgivers"
            ? result.encounters.map((encounter) => ({
                encounterIndex: encounter.encounterIndex,
                cleared: encounter.cleared,
                ghostStrikeCasts: encounter.abilities.find((ability) => ability.abilityId === DEATHGIVERS_GHOST_STRIKE_ID)?.casts ?? 0,
                ghostStrikeDamage: encounter.abilities.find((ability) => ability.abilityId === DEATHGIVERS_GHOST_STRIKE_ID)?.totalDamage ?? 0,
                flurryCasts: encounter.abilities.find((ability) => ability.abilityId === DAGGER_FLURRY_ID)?.casts ?? 0,
              }))
            : [],
        };
      } finally {
        towerProfileOverride.profiles = undefined;
      }
    });
  });
}

describe("Tower T8 fine calibration benchmark", () => {
  it("tests fine T8 presets and Deathgivers setup cadence", () => {
    const rows = T8_PRESETS.flatMap((preset) => runT8Preset(preset));
    const summary = T8_PRESETS.map((preset) => {
      const scoped = rows.filter((row) => row.preset === preset);
      const favorable = scoped.filter((row) => row.matchup === "favorable");
      const favorableClears = favorable.filter((row) => row.clear);
      const neutral = scoped.filter((row) => row.matchup === "neutral");
      const neutralClears = neutral.filter((row) => row.clear);
      return {
        preset,
        favorableRuns: favorable.length,
        favorableClears: favorableClears.length,
        favorableClearRatePct: Number(((favorableClears.length / favorable.length) * 100).toFixed(1)),
        avgFavorableClearHpPct: favorableClears.length === 0 ? 0 : Number((favorableClears.reduce((sum, row) => sum + row.hpPct, 0) / favorableClears.length).toFixed(1)),
        neutralRuns: neutral.length,
        neutralClears: neutralClears.length,
        neutralLeakRatePct: Number(((neutralClears.length / neutral.length) * 100).toFixed(1)),
      };
    });
    const perWeapon = T8_PRESETS.flatMap((preset) => ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
      const scoped = rows.filter((row) => row.preset === preset && row.weapon === weapon.label && row.matchup === "favorable");
      const clears = scoped.filter((row) => row.clear);
      return {
        preset,
        weapon: weapon.label,
        runs: scoped.length,
        clears: clears.length,
        clearRatePct: scoped.length === 0 ? 0 : Number(((clears.length / scoped.length) * 100).toFixed(1)),
        avgClearHpPct: clears.length === 0 ? 0 : Number((clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length).toFixed(1)),
        worstClearHpPct: clears.length === 0 ? 0 : Number(Math.min(...clears.map((row) => row.hpPct)).toFixed(1)),
      };
    }));
    const failures = rows.filter((row) => row.matchup === "favorable" && !row.clear);
    const deathgivers = rows.filter((row) => row.weapon === "Deathgivers" && row.matchup === "favorable").map((row) => ({
      preset: row.preset,
      faction: row.faction,
      clear: row.clear,
      hpPct: row.hpPct,
      ghostStrikeCasts: row.ghostStrikeCasts,
      ghostStrikeDamage: row.ghostStrikeDamage,
      flurryCasts: row.flurryCasts,
      setupOpportunityRatioPct: row.ghostStrikeCasts === 0 ? 0 : Number((Math.min(row.ghostStrikeCasts, row.flurryCasts) / row.ghostStrikeCasts * 100).toFixed(1)),
    }));
    const deathgiversEncounters = rows
      .filter((row) => row.weapon === "Deathgivers" && row.matchup === "favorable")
      .flatMap((row) => row.deathgiversEncounterTelemetry.map((encounter) => ({ preset: row.preset, faction: row.faction, ...encounter })));

    console.log("[TOWER_T8_FINE_PRESET_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_T8_FINE_FAVORABLE_WEAPON]");
    console.table(perWeapon);
    console.log("[TOWER_T8_FINE_FAVORABLE_FAILURES]");
    console.table(failures);
    console.log("[TOWER_DEATHGIVERS_SETUP_CADENCE]");
    console.table(deathgivers);
    console.log("[TOWER_DEATHGIVERS_ENCOUNTER_CADENCE]");
    console.table(deathgiversEncounters);
    console.log("[TOWER_T8_FINE_NOTE] Benchmark-only. Deathgivers cadence tables measure Ghost Strike and Flurry casts, not exact Opening consumption; exact conditional-effect consumption is not exposed by the current harness. Family-wide dagger sustain removed; Deathgivers Opening bonus +1.8x; Great Fire 3.3x; Ursine finisher 2.25x; Claws 1.0x4 + bleed 0.10; Battle Bracers 3.5x; Badon 1.05x; Blazing 1.35x3; Whispering vulnerability removed.");

    expect(rows.length).toBeGreaterThan(0);
    expect(summary).toHaveLength(T8_PRESETS.length);
  }, 300_000);
});
