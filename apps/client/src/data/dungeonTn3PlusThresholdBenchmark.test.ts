import { describe, expect, it } from "vitest";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type BenchmarkEnchantment,
} from "../runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";
type Scenario = "tn3_potion" | "tn4_base";

const TIERS: readonly Tier[] = [4, 5, 6, 7, 8];
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];
const SCENARIOS: readonly Scenario[] = ["tn3_potion", "tn4_base"];

const MASTERY_BY_TIER: Readonly<Record<Tier, number>> = {
  4: 22,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
};

const ZONE_BY_TIER = {
  4: WORLD_ZONE_IDS.mountain,
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

function weaponId(tier: Tier, family: WeaponFamily): string {
  if (family === "broadsword") return `item_weapon_sword_t${tier}_broadsword`;
  if (family === "longbow") return `item_weapon_bow_t${tier}_longbow`;
  if (family === "infernal") return `item_weapon_staff_t${tier}_infernal`;
  if (family === "spiked") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  return `item_weapon_dagger_t${tier}_pair`;
}

function armorIds(tier: Tier, family: WeaponFamily): readonly string[] {
  const base = [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
  return family === "broadsword" ? [...base, `item_shield_t${tier}_reinforced`] : base;
}

function scenarioSettings(scenario: Scenario): {
  readonly enchantment: BenchmarkEnchantment;
  readonly useHealthPotions: boolean;
} {
  if (scenario === "tn3_potion") return { enchantment: 3, useHealthPotions: true };
  // The live harness currently narrows BenchmarkEnchantment to 0..3 even though
  // equipment supports .4. Keep this cast local to the diagnostic: no production
  // API is widened just for a benchmark.
  return { enchantment: 4 as BenchmarkEnchantment, useHealthPotions: false };
}

const round1 = (value: number): number => Number(value.toFixed(1));

describe("dungeon Tn.3++ threshold benchmark", () => {
  it("compares Tn.3 plus potion with base Tn.4 across every dungeon and weapon", () => {
    const rows: Array<{
      scenario: Scenario;
      tier: Tier;
      faction: string;
      dungeon: string;
      weapon: WeaponFamily;
      clear: boolean;
      encounterReached: number;
      seconds: number;
      hpPercent: number;
      potionsUsed: number;
      observedDps: number;
    }> = [];

    for (const scenario of SCENARIOS) {
      const settings = scenarioSettings(scenario);
      for (const tier of TIERS) {
        const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
        for (const dungeon of dungeons) {
          for (const family of FAMILIES) {
            const result = runCombatRuntimeBenchmark({
              label: `${scenario}:${dungeon.id}:${family}`,
              weaponItemId: weaponId(tier, family),
              equipmentItemIds: armorIds(tier, family),
              zoneDefId: ZONE_BY_TIER[tier],
              segmentIndex: 9,
              dungeonDefinitionId: dungeon.id,
              enchantment: settings.enchantment,
              masteryLevel: MASTERY_BY_TIER[tier],
              useHealthPotions: settings.useHealthPotions,
            });

            rows.push({
              scenario,
              tier,
              faction: dungeon.faction,
              dungeon: dungeon.id,
              weapon: family,
              clear: result.clear,
              encounterReached: result.encounterReached,
              seconds: result.seconds,
              hpPercent: result.hpPercent,
              potionsUsed: result.potionsUsed,
              observedDps: result.observedDps,
            });
          }
        }
      }
    }

    const tierSummary = SCENARIOS.flatMap((scenario) => TIERS.map((tier) => {
      const scenarioRows = rows.filter((row) => row.scenario === scenario && row.tier === tier);
      const cleared = scenarioRows.filter((row) => row.clear);
      return {
        scenario,
        tier,
        clears: `${cleared.length}/${scenarioRows.length}`,
        clearRatePct: round1((cleared.length / scenarioRows.length) * 100),
        avgClearSeconds: cleared.length > 0 ? round1(cleared.reduce((sum, row) => sum + row.seconds, 0) / cleared.length) : 0,
        avgClearHpPct: cleared.length > 0 ? round1(cleared.reduce((sum, row) => sum + row.hpPercent, 0) / cleared.length) : 0,
        avgPotionsUsed: cleared.length > 0 ? round1(cleared.reduce((sum, row) => sum + row.potionsUsed, 0) / cleared.length) : 0,
      };
    }));

    const weaponSummary = SCENARIOS.flatMap((scenario) => FAMILIES.map((weapon) => {
      const weaponRows = rows.filter((row) => row.scenario === scenario && row.weapon === weapon);
      const cleared = weaponRows.filter((row) => row.clear);
      return {
        scenario,
        weapon,
        clears: `${cleared.length}/${weaponRows.length}`,
        clearRatePct: round1((cleared.length / weaponRows.length) * 100),
        avgEncounterReached: round1(weaponRows.reduce((sum, row) => sum + row.encounterReached, 0) / weaponRows.length),
        avgDps: round1(weaponRows.reduce((sum, row) => sum + row.observedDps, 0) / weaponRows.length),
      };
    }));

    console.log("[DUNGEON_TN3_PLUS_THRESHOLD_BENCHMARK]");
    console.table(rows);
    console.log("[DUNGEON_TN3_PLUS_TIER_SUMMARY]");
    console.table(tierSummary);
    console.log("[DUNGEON_TN3_PLUS_WEAPON_SUMMARY]");
    console.table(weaponSummary);
    console.log("[DUNGEON_TN3_PLUS_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(DUNGEON_DEFINITIONS.length * FAMILIES.length * SCENARIOS.length);
    expect(rows.every((row) => Number.isFinite(row.seconds) && Number.isFinite(row.observedDps))).toBe(true);
  });
});
