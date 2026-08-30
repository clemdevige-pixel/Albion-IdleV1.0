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

  const tuneDamageAbility = (
    ability: any,
    options: { readonly cooldown?: number; readonly ratio?: number; readonly bonusEffectRatio?: number },
  ) => ({
    ...ability,
    ...(options.cooldown === undefined ? {} : { cooldown: options.cooldown }),
    mechanics: {
      ...ability.mechanics,
      mechanics: ability.mechanics.mechanics.map((mechanic: any) => {
        if (mechanic.kind !== "damage") return mechanic;
        if (options.bonusEffectRatio !== undefined && mechanic.bonusEffect?.effectId === "effect_dagger_opening") {
          return {
            ...mechanic,
            ...(options.ratio === undefined ? {} : { ratio: options.ratio }),
            bonusEffect: { ...mechanic.bonusEffect, bonusRatio: options.bonusEffectRatio },
          };
        }
        return options.ratio === undefined ? mechanic : { ...mechanic, ratio: options.ratio };
      }),
    },
  });

  const galatineTuned = tuneDamageAbility(actual.FACTION_ARTIFACT_ABILITIES.galatineSoullessStream, {
    cooldown: 14,
  });
  const greatFireTuned = tuneDamageAbility(actual.FACTION_ARTIFACT_ABILITIES.greatFirePyroblast, {
    cooldown: 14,
  });
  const deathgiversTuned = tuneDamageAbility(actual.FACTION_ARTIFACT_ABILITIES.deathgiversGhostStrike, {
    cooldown: 14,
    bonusEffectRatio: 2.50,
  });

  const whisperingOriginal = actual.FACTION_ARTIFACT_ABILITIES.whisperingUndeadArrows;
  const whisperingTuned = {
    ...whisperingOriginal,
    cooldown: 20,
    mechanics: {
      ...whisperingOriginal.mechanics,
      mechanics: whisperingOriginal.mechanics.mechanics
        .filter((mechanic: any) => mechanic.effectId !== "effect_bow_whispering_vulnerability")
        .map((mechanic: any) => (
          mechanic.kind === "auto_attack_bonus_window"
            ? { ...mechanic, ratio: 0.60 }
            : mechanic
        )),
    },
  };

  const tunedBySpecialization = new Map<string, any>([
    ["Galatine Pair", galatineTuned],
    ["Whispering Bow", whisperingTuned],
    ["Great Fire Staff", greatFireTuned],
    ["Deathgivers", deathgiversTuned],
  ]);

  return {
    ...actual,
    FACTION_ARTIFACT_ABILITIES: {
      ...actual.FACTION_ARTIFACT_ABILITIES,
      galatineSoullessStream: galatineTuned,
      whisperingUndeadArrows: whisperingTuned,
      greatFirePyroblast: greatFireTuned,
      deathgiversGhostStrike: deathgiversTuned,
    },
    FACTION_ARTIFACT_WEAPON_CONTENT: actual.FACTION_ARTIFACT_WEAPON_CONTENT.map((entry: any) => {
      const tuned = tunedBySpecialization.get(entry.specializationName);
      return tuned === undefined ? entry : { ...entry, signatureAbility: tuned };
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
const TRIAL_SEED = "tower-endless-final-cadence-gate-trial";
const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const T8_EXTRA_MULTIPLIER = 1.05;
const TARGET_WEAPONS = new Set([
  "Galatine Pair",
  "Whispering Bow",
  "Great Fire Staff",
  "Ursine Maulers",
  "Battle Bracers",
  "Deathgivers",
  "Claws",
]);

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
  ability_sword_galatine_soulless_stream: 2.90 / 2.6,
  ability_fire_great_pyroblast: 3.55 / 2.0,
  ability_gloves_battle_bracers_falcon_smash: 3.90 / 2.6,
  ability_dagger_claws_disembowel: 1.06 / 1.4,
};
const EFFECT_DAMAGE_TUNING_BY_WEAPON: Readonly<Record<string, number>> = {
  Claws: 0.10 / 0.15,
};
const URSINE_DIRECT_MULTIPLIER = (1.8 + 2.65) / (1.8 + 1.65);

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
      label: `tower_final_cadence_${weapon.label.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}_${String(block.blockIndex + 1)}`,
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
    return {
      tier,
      faction,
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
function targetWeapons(): readonly BenchmarkSpec[] {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.filter((weapon) => TARGET_WEAPONS.has(weapon.label));
}
function runAll(): Row[] {
  const weapons = targetWeapons();
  return allBlocks().flatMap(({ block, seed }) => weapons.map((weapon) => runWeaponBlock(block, weapon, seed)));
}
function summarize(rows: readonly Row[], matchup: Matchup) {
  return targetWeapons().flatMap((weapon) => TIERS.map((tier) => {
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

describe("Tower Endless final cadence gate benchmark", () => {
  it("tests cadence fixes for the remaining favorable failures", () => {
    const rows = runAll();
    const favorable = summarize(rows, "favorable");
    const neutralLeaks = summarize(rows, "neutral").filter((row) => row.clears > 0);
    const failures = rows.filter((row) => row.matchup === "favorable" && !row.clear);
    const t8 = favorable.filter((row) => row.tier === 8);

    console.log("[TOWER_FINAL_CADENCE_FAVORABLE]");
    console.table(favorable);
    console.log("[TOWER_FINAL_CADENCE_FAILURES]");
    console.table(failures);
    console.log("[TOWER_FINAL_CADENCE_NEUTRAL_LEAKS]");
    console.table(neutralLeaks);
    console.log("[TOWER_FINAL_CADENCE_T8]");
    console.table(t8);
    console.log("[TOWER_FINAL_CADENCE_NOTE] Benchmark-only delta on top of the locked candidate: Galatine CD 14s; Whispering CD 20s; Great Fire CD 14s; Deathgivers CD 14s; Ursine finisher 2.65; Battle Bracers 3.90; Claws 1.06x4. All previous Tower normalization, T8 x1.05, dagger sustain removal and prior weapon tuning remain conceptually unchanged.");

    expect(rows.length).toBeGreaterThan(0);
    expect(targetWeapons()).toHaveLength(7);
  }, 300_000);
});
