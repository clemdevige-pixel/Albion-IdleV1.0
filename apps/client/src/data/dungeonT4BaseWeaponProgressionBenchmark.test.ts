import { describe, expect, it, vi } from "vitest";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

type DungeonCombatProfileInput = {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
};

type DungeonContentCatalogMockModule = Readonly<Record<string, unknown>> & {
  readonly resolveDungeonCombatProfile: (input: DungeonCombatProfileInput) => AuthoredEnemyCombatProfile;
};

vi.mock("./dungeonContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<DungeonContentCatalogMockModule>();
  return {
    ...actual,
    resolveDungeonCombatProfile: (input: DungeonCombatProfileInput): AuthoredEnemyCombatProfile => {
      const profile = actual.resolveDungeonCombatProfile(input);
      if (input.dungeonDefinitionId !== "dungeon_keeper_t4") return profile;
      return {
        ...profile,
        hp: profile.hp * 0.85,
        damage: profile.damage * 0.85,
        armor: profile.armor * 0.95,
        magicResistance: profile.magicResistance * 0.95,
      };
    },
  };
});

import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type CombatRuntimeBenchmarkDamageTuning,
} from "../runtime/CombatRuntimeBenchmarkHarness.js";

type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";

const TIER = 4 as const;
const MASTERY_LEVEL = 22;
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];

function weaponId(family: WeaponFamily): string {
  if (family === "broadsword") return "item_weapon_sword_t4_broadsword";
  if (family === "longbow") return "item_weapon_bow_t4_longbow";
  if (family === "infernal") return "item_weapon_staff_t4_infernal";
  if (family === "spiked") return "item_weapon_gloves_t4_spiked_gauntlets";
  return "item_weapon_dagger_t4_pair";
}

function equipmentIds(family: WeaponFamily, faction: string): readonly string[] {
  const base = [
    "item_helmet_t4_reinforced",
    "item_armor_t4_leather",
    "item_boots_t4_leather",
    `item_cape_t4_${faction.toLowerCase()}`,
  ];
  return family === "broadsword"
    ? [...base, "item_shield_t4_reinforced"]
    : base;
}

/** Candidate weapon balance values under evaluation only. Authored live weapon data is untouched. */
function benchmarkDamageTuning(family: WeaponFamily): CombatRuntimeBenchmarkDamageTuning | undefined {
  if (family === "longbow") return { autoAttackMultiplier: 0.84 };
  if (family === "infernal") {
    return {
      directAbilityMultiplierById: {
        ability_fire_fireball: 1.05,
        ability_fire_cataclysm: 1.1,
      },
      effectDamageMultiplier: 1.5,
    };
  }
  if (family === "dual_dagger") {
    return {
      directAbilityMultiplierById: {
        ability_dagger_double_slash: 1.1,
        ability_dagger_flurry: 1.1,
      },
    };
  }
  return undefined;
}

const round1 = (value: number): number => Number(value.toFixed(1));

describe("T4.3 base-weapon faction dungeon progression benchmark", () => {
  it("measures every T4 faction dungeon with matching cape and health potions", () => {
    const t4Dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === TIER);
    const rows = t4Dungeons.flatMap((dungeon) => FAMILIES.map((family) => {
      const damageTuning = benchmarkDamageTuning(family);
      const result = runCombatRuntimeBenchmark({
        label: `${dungeon.id}:${family}:t4.3:faction-cape:potion`,
        weaponItemId: weaponId(family),
        equipmentItemIds: equipmentIds(family, dungeon.faction),
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: 9,
        dungeonDefinitionId: dungeon.id,
        enchantment: 3,
        masteryLevel: MASTERY_LEVEL,
        useHealthPotions: true,
        ...(damageTuning === undefined ? {} : { damageTuning }),
      });

      return {
        dungeon: dungeon.id,
        faction: dungeon.faction,
        weapon: family,
        clear: result.clear,
        bossProgressPct: result.bossProgressPercent,
        enemyHpRemainingPct: result.enemyHpRemainingPercent,
        dps: result.observedDps,
        seconds: result.seconds,
        hpPct: result.hpPercent,
        potions: result.potionsUsed,
        capeReductionPct: result.dungeonDamageReductionPercent,
      };
    }));

    const dungeonSummary = t4Dungeons.map((dungeon) => {
      const dungeonRows = rows.filter((row) => row.dungeon === dungeon.id);
      const clears = dungeonRows.filter((row) => row.clear);
      return {
        dungeon: dungeon.id,
        faction: dungeon.faction,
        clears: `${clears.length}/${dungeonRows.length}`,
        clearRatePct: round1((clears.length / dungeonRows.length) * 100),
        avgBossProgressPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / dungeonRows.length,
        ),
        minBossProgressPct: round1(Math.min(...dungeonRows.map((row) => row.bossProgressPct))),
        maxBossProgressPct: round1(Math.max(...dungeonRows.map((row) => row.bossProgressPct))),
        avgDps: round1(dungeonRows.reduce((sum, row) => sum + row.dps, 0) / dungeonRows.length),
        avgPotions: round1(dungeonRows.reduce((sum, row) => sum + row.potions, 0) / dungeonRows.length),
      };
    });

    console.log("[DUNGEON_T4_BASE_WEAPON_BY_FACTION]");
    console.table(rows);
    console.log("[DUNGEON_T4_BASE_WEAPON_FACTION_SUMMARY]");
    console.table(dungeonSummary);

    expect(rows).toHaveLength(t4Dungeons.length * FAMILIES.length);
    expect(rows.every((row) => row.capeReductionPct === 6)).toBe(true);
    expect(rows.every((row) => row.potions > 0)).toBe(true);
  });
});
