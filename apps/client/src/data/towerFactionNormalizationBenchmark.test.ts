import { describe, expect, it, vi } from "vitest";

vi.mock("./dungeonContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./dungeonContentCatalog.js")>();
  const { applyTowerFactionCombatNormalization } = await import("./towerCombatNormalization.js");

  return {
    ...actual,
    resolveDungeonCombatProfile: (
      input: Parameters<typeof actual.resolveDungeonCombatProfile>[0],
    ) => {
      const profile = actual.resolveDungeonCombatProfile(input);
      const dungeon = actual.getDungeonDefinition(input.dungeonDefinitionId);
      const factionId = dungeon.faction.toLowerCase();
      if (
        factionId !== "keeper"
        && factionId !== "heretic"
        && factionId !== "undead"
        && factionId !== "morgana"
      ) return profile;
      if (
        dungeon.tier !== 4
        && dungeon.tier !== 5
        && dungeon.tier !== 6
        && dungeon.tier !== 7
        && dungeon.tier !== 8
      ) return profile;

      return applyTowerFactionCombatNormalization(
        { factionId, tier: dungeon.tier },
        profile,
      );
    },
  };
});

import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactDungeonEquipment,
  type ArtifactBenchmarkTier,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;
const ENDGAME_FAMILY_MASTERY = 75;
const ENDGAME_WEAPON_MASTERY = 45;
const ENDGAME_SIBLING_MASTERY = 45;
const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;
const BENCHMARK_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const NEUTRAL_CAPE_FACTION_BY_ENEMY = {
  keeper: "heretic",
  heretic: "undead",
  undead: "morgana",
  morgana: "keeper",
} as const;

function isArtifactBenchmarkTier(tier: number): tier is ArtifactBenchmarkTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}

function runTowerNormalizedFactionNeutralMatrix() {
  return DUNGEON_DEFINITIONS
    .filter((dungeon) => FACTIONS.includes(dungeon.faction.toLowerCase() as (typeof FACTIONS)[number]))
    .flatMap((dungeon) => {
      const tier = dungeon.tier;
      if (!isArtifactBenchmarkTier(tier)) return [];
      const faction = dungeon.faction.toLowerCase() as (typeof FACTIONS)[number];
      const neutralCapeFaction = NEUTRAL_CAPE_FACTION_BY_ENEMY[faction];

      return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
        const weaponItemId = weapon.itemId(tier);
        const result = runCombatRuntimeBenchmark({
          label: `tower_normalized_${faction}_t${String(tier)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
          weaponItemId,
          equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, neutralCapeFaction),
          zoneDefId: WORLD_ZONE_IDS.mountain,
          segmentIndex: 9,
          dungeonDefinitionId: dungeon.id,
          enchantment: 3,
          familyMasteryLevel: ENDGAME_FAMILY_MASTERY,
          specializationMasteryLevel: ENDGAME_WEAPON_MASTERY,
          siblingSpecializationMasteryLevel: ENDGAME_SIBLING_MASTERY,
          heroDamageMultiplier: 1,
          useHealthPotions: true,
          healthPotionQuantity: POTION_CAP,
        });

        return {
          faction,
          tier,
          family: weapon.family,
          weapon: weapon.label,
          clear: result.clear,
          seconds: result.seconds,
          hpPct: result.hpPercent,
          potions: result.potionsUsed,
          bossProgressPct: result.bossProgressPercent,
          dps: result.observedDps,
          incomingDps: result.incomingDps,
          capeReductionPct: result.dungeonDamageReductionPercent,
        };
      });
    });
}

function summarizeByWeapon(rows: ReturnType<typeof runTowerNormalizedFactionNeutralMatrix>) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
    const weaponRows = rows.filter((row) => row.family === weapon.family && row.weapon === weapon.label);
    const clears = weaponRows.filter((row) => row.clear).length;
    return {
      family: weapon.family,
      weapon: weapon.label,
      runs: weaponRows.length,
      clears,
      failures: weaponRows.length - clears,
      avgHpPct: Number((weaponRows.reduce((sum, row) => sum + row.hpPct, 0) / weaponRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...weaponRows.map((row) => row.hpPct)).toFixed(1)),
      avgDps: Number((weaponRows.reduce((sum, row) => sum + row.dps, 0) / weaponRows.length).toFixed(1)),
      avgSeconds: Number((weaponRows.reduce((sum, row) => sum + row.seconds, 0) / weaponRows.length).toFixed(1)),
    };
  });
}

function summarizeByFaction(rows: ReturnType<typeof runTowerNormalizedFactionNeutralMatrix>) {
  return FACTIONS.flatMap((faction) => BENCHMARK_TIERS.map((tier) => {
    const contextRows = rows.filter((row) => row.faction === faction && row.tier === tier);
    const clears = contextRows.filter((row) => row.clear).length;
    return {
      faction,
      tier,
      runs: contextRows.length,
      clears,
      failures: contextRows.length - clears,
      avgHpPct: Number((contextRows.reduce((sum, row) => sum + row.hpPct, 0) / contextRows.length).toFixed(1)),
      worstHpPct: Number(Math.min(...contextRows.map((row) => row.hpPct)).toFixed(1)),
      avgIncomingDps: Number((contextRows.reduce((sum, row) => sum + row.incomingDps, 0) / contextRows.length).toFixed(1)),
    };
  }));
}

describe("Tower faction normalization benchmark", () => {
  it("compares all artifact specializations after Tower-only normalization", () => {
    const rows = runTowerNormalizedFactionNeutralMatrix();
    const weaponSummary = summarizeByWeapon(rows);
    const factionSummary = summarizeByFaction(rows);

    console.log("[TOWER_NORMALIZED_FACTION_NEUTRAL_ALL_WEAPONS]");
    console.table(rows);
    console.log("[TOWER_NORMALIZED_FACTION_NEUTRAL_WEAPON_SUMMARY]");
    console.table(weaponSummary);
    console.log("[TOWER_NORMALIZED_FACTION_NEUTRAL_CONTEXT_SUMMARY]");
    console.table(factionSummary);
    console.log("[TOWER_NORMALIZED_FACTION_NEUTRAL_NOTE] production Tower faction/tier normalization applied to canonical Dungeon combat profiles; no anti-faction weapon bonus, no Tower resilience multiplier, and a deliberately non-matching faction cape. Raw Dungeon benchmark remains separate as a control and Dungeon authored balance is unchanged.");

    expect(rows).toHaveLength(FACTIONS.length * BENCHMARK_TIERS.length * ARTIFACT_WEAPON_BENCHMARK_SPECS.length);
    expect(rows.every((row) => row.capeReductionPct === 0)).toBe(true);
    expect(weaponSummary.every((row) => row.runs === FACTIONS.length * BENCHMARK_TIERS.length)).toBe(true);
    expect(factionSummary.every((row) => row.runs === ARTIFACT_WEAPON_BENCHMARK_SPECS.length)).toBe(true);
  });
});
