import { describe, expect, it } from "vitest";
import { HERETIC_T4_DUNGEON_ID } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type CombatRuntimeBenchmarkDamageTuning,
} from "../runtime/CombatRuntimeBenchmarkHarness.js";

type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";

const MASTERY_LEVEL = 22;
const FACTION = "Heretic";
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];
const BONUS_PCTS = [10, 15, 20, 25, 30, 35, 40] as const;

function weaponId(family: WeaponFamily): string {
  if (family === "broadsword") return "item_weapon_sword_t4_broadsword";
  if (family === "longbow") return "item_weapon_bow_t4_longbow";
  if (family === "infernal") return "item_weapon_staff_t4_infernal";
  if (family === "spiked") return "item_weapon_gloves_t4_spiked_gauntlets";
  return "item_weapon_dagger_t4_pair";
}

function equipmentIds(family: WeaponFamily): readonly string[] {
  const base = [
    "item_helmet_t4_reinforced",
    "item_armor_t4_leather",
    "item_boots_t4_leather",
    `item_cape_t4_${FACTION.toLowerCase()}`,
  ];
  return family === "broadsword"
    ? [...base, "item_shield_t4_reinforced"]
    : base;
}

/** Candidate base-weapon balance values under evaluation only. Authored live weapon data is untouched. */
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

describe("T4 faction-weapon bonus sweep against the next dungeon", () => {
  it("finds the minimum Heretic damage bonus that makes all simulated Keeper weapons clear", () => {
    const encounterRows: Array<{
      bonusPct: number;
      weapon: WeaponFamily;
      encounter: number;
      cleared: boolean;
      seconds: number;
      hpBeforePct: number;
      hpAfterPct: number;
      potions: number;
      enemyHpRemainingPct: number;
      encounterProgressPct: number;
    }> = [];

    const rows = BONUS_PCTS.flatMap((bonusPct) => FAMILIES.map((family) => {
      const damageTuning = benchmarkDamageTuning(family);
      const result = runCombatRuntimeBenchmark({
        label: `${HERETIC_T4_DUNGEON_ID}:${family}:keeper-weapon-sim:+${bonusPct}pct`,
        weaponItemId: weaponId(family),
        equipmentItemIds: equipmentIds(family),
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: 9,
        dungeonDefinitionId: HERETIC_T4_DUNGEON_ID,
        enchantment: 3,
        masteryLevel: MASTERY_LEVEL,
        useHealthPotions: true,
        heroDamageMultiplier: 1 + bonusPct / 100,
        ...(damageTuning === undefined ? {} : { damageTuning }),
      });

      for (const encounter of result.encounters) {
        encounterRows.push({
          bonusPct,
          weapon: family,
          encounter: encounter.encounterIndex,
          cleared: encounter.cleared,
          seconds: encounter.seconds,
          hpBeforePct: encounter.hpBeforePercent,
          hpAfterPct: encounter.hpAfterPercent,
          potions: encounter.potionsUsed,
          enemyHpRemainingPct: encounter.enemyHpRemainingPercent,
          encounterProgressPct: encounter.encounterProgressPercent,
        });
      }

      return {
        bonusPct,
        weapon: family,
        clear: result.clear,
        bossProgressPct: result.bossProgressPercent,
        enemyHpRemainingPct: result.enemyHpRemainingPercent,
        dps: result.observedDps,
        seconds: result.seconds,
        hpPct: result.hpPercent,
        potions: result.potionsUsed,
      };
    }));

    const summary = BONUS_PCTS.map((bonusPct) => {
      const bonusRows = rows.filter((row) => row.bonusPct === bonusPct);
      const clears = bonusRows.filter((row) => row.clear);
      return {
        bonusPct,
        clears: `${clears.length}/${bonusRows.length}`,
        clearRatePct: round1((clears.length / bonusRows.length) * 100),
        avgBossProgressPct: round1(
          bonusRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / bonusRows.length,
        ),
        minBossProgressPct: round1(Math.min(...bonusRows.map((row) => row.bossProgressPct))),
        avgClearHpPct: clears.length > 0
          ? round1(clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length)
          : 0,
        avgClearSeconds: clears.length > 0
          ? round1(clears.reduce((sum, row) => sum + row.seconds, 0) / clears.length)
          : 0,
      };
    });

    console.log("[DUNGEON_T4_FACTION_WEAPON_BONUS_SWEEP]");
    console.table(summary);
    console.log("[DUNGEON_T4_FACTION_WEAPON_BONUS_SWEEP_DETAIL]");
    console.table(rows);
    console.log("[DUNGEON_T4_FACTION_WEAPON_ENCOUNTER_SUSTAIN]");
    console.table(encounterRows);

    expect(rows).toHaveLength(BONUS_PCTS.length * FAMILIES.length);
    expect(rows.every((row) => row.potions > 0)).toBe(true);
    expect(encounterRows.length).toBeGreaterThan(rows.length);
  });
});
