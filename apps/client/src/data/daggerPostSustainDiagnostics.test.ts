import { describe, expect, it, vi } from "vitest";
import { getWorldTierTransitionContract, TOWER_TRIAL_BLOCKS } from "@game/data";
import { getTowerBlocks, type TowerBlockDefinition } from "@game/gameplay";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

interface WeaponContentSurface {
  readonly resolveUnlockedWeaponAbilities: (weaponItemId: string, specializationMasteryLevel: number) => readonly any[];
  readonly [key: string]: unknown;
}
interface DungeonCombatProfileInput {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}
interface DungeonContentMockSurface {
  readonly resolveDungeonCombatProfile: (input: DungeonCombatProfileInput) => AuthoredEnemyCombatProfile;
  readonly [key: string]: unknown;
}
interface RuntimeModuleSurface {
  readonly CombatRuntime: new (...args: any[]) => any;
  readonly [key: string]: unknown;
}
interface TerminalTraceRow {
  readonly tick: number;
  readonly state: string;
  readonly heroBefore: number;
  readonly heroAfter: number;
  readonly enemyBefore: number;
  readonly enemyAfter: number;
  readonly heroAliveAfter: boolean;
  readonly enemyAliveAfter: boolean;
}

const legacySustainOverride = vi.hoisted(() => ({ enabled: false }));
const towerProfileOverride = vi.hoisted(() => ({
  profiles: undefined as readonly AuthoredEnemyCombatProfile[] | undefined,
}));
const terminalTraceOverride = vi.hoisted(() => ({
  enabled: false,
  rows: [] as TerminalTraceRow[],
}));

const SYNCED_SIGNATURE_IDS = new Set([
  "ability_dagger_pair_cross_assault",
  "ability_dagger_deathgivers_ghost_strike",
]);

vi.mock("./weaponContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<WeaponContentSurface>();
  return {
    ...actual,
    resolveUnlockedWeaponAbilities: (weaponItemId: string, specializationMasteryLevel: number) => {
      const abilities = actual.resolveUnlockedWeaponAbilities(weaponItemId, specializationMasteryLevel);
      return abilities.map((ability: any) => {
        const abilityId = String(ability.id);
        if (SYNCED_SIGNATURE_IDS.has(abilityId)) {
          return { ...ability, cooldown: 8 };
        }
        if (
          legacySustainOverride.enabled
          && weaponItemId.includes("item_weapon_dagger_")
          && abilityId === "ability_dagger_double_slash"
        ) {
          return {
            ...ability,
            mechanics: {
              ...ability.mechanics,
              mechanics: [
                ...ability.mechanics.mechanics,
                { kind: "heal_from_damage", ratio: 0.12, maxHealthRatio: 0.015 },
              ],
            },
          };
        }
        return ability;
      });
    },
  };
});

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

vi.mock("../runtime/CombatRuntime.js", async (importOriginal) => {
  const actual = await importOriginal<RuntimeModuleSurface>();
  const BaseCombatRuntime = actual.CombatRuntime;
  return {
    ...actual,
    CombatRuntime: class DiagnosticCombatRuntime extends BaseCombatRuntime {
      private readonly diagnosticDeps: any;

      constructor(...args: any[]) {
        super(...args);
        this.diagnosticDeps = args[0];
      }

      override tick(dt: number, tickCounter: number): any {
        if (!terminalTraceOverride.enabled) return super.tick(dt, tickCounter);
        const enemyId = this.getActiveEnemyId();
        const damageManager = this.diagnosticDeps.damageManager;
        const heroId = this.diagnosticDeps.heroId;
        const heroBefore = damageManager.getHealth(heroId).currentHealth;
        const enemyAliveBefore = enemyId !== 0 && damageManager.isAlive(enemyId);
        const enemyBefore = enemyAliveBefore ? damageManager.getHealth(enemyId).currentHealth : 0;
        const result = super.tick(dt, tickCounter);
        const heroAliveAfter = damageManager.isAlive(heroId);
        const currentEnemyId = this.getActiveEnemyId();
        const enemyAliveAfter = currentEnemyId !== 0 && damageManager.isAlive(currentEnemyId);
        const heroAfter = damageManager.getHealth(heroId).currentHealth;
        const enemyAfter = enemyAliveAfter ? damageManager.getHealth(currentEnemyId).currentHealth : 0;
        terminalTraceOverride.rows.push({
          tick: tickCounter,
          state: String(result.combatState),
          heroBefore,
          heroAfter,
          enemyBefore,
          enemyAfter,
          heroAliveAfter,
          enemyAliveAfter,
        });
        if (terminalTraceOverride.rows.length > 60) terminalTraceOverride.rows.shift();
        return result;
      }
    },
  };
});

import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { artifactDungeonEquipment } from "./artifactWeaponBenchmarkFixtures.js";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

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

function runDaggerPairWall(tier: WorldTier, sustain: boolean, enchantment: 2 | 3, useHealthPotions: boolean) {
  const contract = getWorldTierTransitionContract(tier);
  legacySustainOverride.enabled = sustain;
  try {
    return runCombatRuntimeBenchmark({
      label: `dagger_pair_world_t${String(tier)}_${sustain ? "legacy_sustain" : "live_no_sustain"}_${String(enchantment)}_${useHealthPotions ? "potion" : "no_potion"}`,
      weaponItemId: DAGGER_PAIR_BY_TIER[tier],
      zoneDefId: WALL_ZONE_BY_TIER[tier],
      segmentIndex: 9,
      equipmentItemIds: ARMOR_BY_TIER[tier],
      masteryLevel: contract.masteryLevel,
      enchantment,
      useHealthPotions,
    });
  } finally {
    legacySustainOverride.enabled = false;
  }
}

const DEATHGIVERS_ID = "item_weapon_dagger_deathgivers_t8";
const GHOST_STRIKE_ID = "ability_dagger_deathgivers_ghost_strike";
const FLURRY_ID = "ability_dagger_flurry";
const ENDLESS_SEEDS = ["tower-benchmark-alpha", "tower-benchmark-beta", "tower-benchmark-gamma", "tower-benchmark-delta"] as const;
type BenchmarkBlock = Pick<TowerBlockDefinition, "id" | "blockIndex" | "floorStart" | "floorEnd" | "tier" | "factionId" | "source">;

function deathgiversT8HereticBlocks(): readonly { readonly block: BenchmarkBlock; readonly seed: string }[] {
  const trial = TOWER_TRIAL_BLOCKS.map((block) => ({ block: { ...block, source: "trial" as const }, seed: "dagger-diagnostic-trial" }));
  const endless = ENDLESS_SEEDS.flatMap((seed) => (
    getTowerBlocks(TOWER_TRIAL_BLOCKS.length, 20, seed).map((block) => ({ block, seed }))
  ));
  return [...trial, ...endless].filter(({ block }) => block.tier === 8 && block.factionId === "heretic");
}

function runDeathgiversBlock(block: BenchmarkBlock, seed: string) {
  const dungeon = DUNGEON_DEFINITIONS.find((entry) => entry.tier === 8 && entry.faction.toLowerCase() === "heretic");
  if (dungeon === undefined) throw new Error("Missing Heretic T8 dungeon");
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId: DEATHGIVERS_ID, capeItemId: "item_cape_t8_heretic" },
    { factionId: "heretic", tier: 8, activity: "tower" },
  );
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );
  const floors = Array.from({ length: block.floorEnd - block.floorStart + 1 }, (_, index) => block.floorStart + index);
  const resolved = floors.map((floor) => resolveTowerEncounter(floor, seed));
  towerProfileOverride.profiles = resolved.map((entry) => entry.combatProfile);
  try {
    return runCombatRuntimeBenchmark({
      label: `deathgivers_t8_heretic_${String(block.blockIndex + 1)}`,
      weaponItemId: DEATHGIVERS_ID,
      equipmentItemIds: artifactDungeonEquipment(DEATHGIVERS_ID, 8, dungeon.faction),
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
  } finally {
    towerProfileOverride.profiles = undefined;
  }
}

describe("Dagger post-sustain diagnostics", () => {
  it("measures Dagger Pair world walls with and without the removed shared sustain", () => {
    const rows = ([4, 5, 6, 7] as const).flatMap((tier) => {
      const contract = getWorldTierTransitionContract(tier);
      const scenarios = [
        { name: ".2+potion", enchantment: contract.blockedEnchantment, useHealthPotions: true },
        { name: ".3-no-potion", enchantment: contract.requiredEnchantment, useHealthPotions: false },
        { name: ".3+potion", enchantment: contract.requiredEnchantment, useHealthPotions: true },
      ] as const;
      return scenarios.flatMap((scenario) => [false, true].map((sustain) => {
        const result = runDaggerPairWall(tier, sustain, scenario.enchantment, scenario.useHealthPotions);
        return {
          tier,
          scenario: scenario.name,
          sustain: sustain ? "legacy" : "live-none",
          clear: result.clear,
          hpPct: result.hpPercent,
          bossProgressPct: result.bossProgressPercent,
          encounterProgressPct: result.encounterProgressPercent,
          potionsUsed: result.potionsUsed,
          damageReceived: Math.round(result.damageReceived),
        };
      }));
    });

    console.log("[DAGGER_PAIR_WORLD_WALL_SUSTAIN_AB]");
    console.table(rows);

    const liveRequiredPotion = rows.filter((row) => row.sustain === "live-none" && row.scenario === ".3+potion");
    expect(liveRequiredPotion.every((row) => row.clear)).toBe(true);
  });

  it("traces the terminal T5 Dagger Pair wall resolution", () => {
    terminalTraceOverride.rows.length = 0;
    terminalTraceOverride.enabled = true;
    try {
      const result = runDaggerPairWall(5, false, 3, true);
      console.log("[DAGGER_PAIR_T5_TERMINAL_RESULT]");
      console.table([{
        clear: result.clear,
        hpPct: result.hpPercent,
        bossProgressPct: result.bossProgressPercent,
        encounterProgressPct: result.encounterProgressPercent,
        damageDealt: result.damageDealt,
        damageReceived: result.damageReceived,
        potionsUsed: result.potionsUsed,
      }]);
      console.log("[DAGGER_PAIR_T5_TERMINAL_TRACE]");
      console.table(terminalTraceOverride.rows.slice(-30));
    } finally {
      terminalTraceOverride.enabled = false;
    }
    expect(terminalTraceOverride.rows.length).toBeGreaterThan(0);
  });

  it("diagnoses Deathgivers Flurry to Ghost Strike cadence on favorable T8 Heretic blocks", () => {
    const rows = deathgiversT8HereticBlocks().map(({ block, seed }) => {
      const result = runDeathgiversBlock(block, seed);
      const ghost = result.abilities.find((ability) => ability.abilityId === GHOST_STRIKE_ID);
      const flurry = result.abilities.find((ability) => ability.abilityId === FLURRY_ID);
      return {
        block: block.blockIndex + 1,
        seed,
        clear: result.clear,
        hpPct: result.hpPercent,
        failedProgressPct: result.clear ? 100 : result.encounterProgressPercent,
        ghostCasts: ghost?.casts ?? 0,
        ghostDamage: Math.round(ghost?.totalDamage ?? 0),
        flurryCasts: flurry?.casts ?? 0,
        flurryDamage: Math.round(flurry?.totalDamage ?? 0),
        ghostPerFlurry: (flurry?.casts ?? 0) === 0 ? 0 : Number(((ghost?.casts ?? 0) / (flurry?.casts ?? 1)).toFixed(2)),
        encounters: result.encounters.map((encounter) => ({
          index: encounter.encounterIndex,
          cleared: encounter.cleared,
          progressPct: encounter.encounterProgressPercent,
          ghost: encounter.abilities.find((ability) => ability.abilityId === GHOST_STRIKE_ID)?.casts ?? 0,
          flurry: encounter.abilities.find((ability) => ability.abilityId === FLURRY_ID)?.casts ?? 0,
        })),
      };
    });

    console.log("[DEATHGIVERS_T8_HERETIC_CADENCE]");
    console.table(rows.map(({ encounters: _encounters, ...row }) => row));
    console.log("[DEATHGIVERS_T8_HERETIC_ENCOUNTERS]");
    for (const row of rows) {
      console.log(`[DEATHGIVERS_BLOCK_${String(row.block)}_${row.seed}]`);
      console.table(row.encounters);
    }

    expect(rows.length).toBeGreaterThan(0);
  });
});
