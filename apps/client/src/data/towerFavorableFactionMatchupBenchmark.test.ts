import { describe, expect, it, vi } from "vitest";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

interface DungeonCombatProfileInput {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}

interface DungeonContentMockSurface {
  readonly getDungeonDefinition: (dungeonDefinitionId: string) => {
    readonly faction: string;
    readonly tier: number;
  };
  readonly resolveDungeonCombatProfile: (
    input: DungeonCombatProfileInput,
  ) => AuthoredEnemyCombatProfile;
  readonly [key: string]: unknown;
}

vi.mock("./dungeonContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<DungeonContentMockSurface>();
  const { applyTowerFactionCombatNormalization } = await import("./towerCombatNormalization.js");

  return {
    ...actual,
    resolveDungeonCombatProfile: (input: DungeonCombatProfileInput) => {
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
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;
const ENDGAME_FAMILY_MASTERY = 75;
const ENDGAME_WEAPON_MASTERY = 45;
const ENDGAME_SIBLING_MASTERY = 45;
const BENCHMARK_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

function runFavorableFactionMatrix() {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => (
    BENCHMARK_TIERS.map((tier) => {
      const weaponItemId = weapon.itemId(tier);
      const favorableDungeons = DUNGEON_DEFINITIONS.filter((dungeon) => (
        dungeon.tier === tier
        && resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction) > 0
      ));
      if (favorableDungeons.length !== 1) {
        throw new Error(
          `Expected one favorable T${String(tier)} dungeon for ${weapon.label}, found ${String(favorableDungeons.length)}`,
        );
      }

      const dungeon = favorableDungeons[0]!;
      const factionId = dungeon.faction.toLowerCase();
      if (
        factionId !== "keeper"
        && factionId !== "heretic"
        && factionId !== "undead"
        && factionId !== "morgana"
      ) {
        throw new Error(`Unsupported Tower faction ${dungeon.faction}`);
      }

      const capeItemId = `item_cape_t${String(tier)}_${factionId}`;
      const modifiers = resolveFactionCombatModifiers(
        { weaponItemId, capeItemId },
        { factionId, tier, activity: "tower" },
      );
      const heroDamageMultiplier = (
        (1 + modifiers.outgoingDamageBonusPercent / 100)
        * modifiers.factionResilienceDamageMultiplier
      );

      const result = runCombatRuntimeBenchmark({
        label: `tower_favorable_${factionId}_t${String(tier)}_${weapon.family}_${weapon.label.replaceAll(" ", "_").toLowerCase()}`,
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
      });

      return {
        faction: factionId,
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
        outgoingBonusPct: modifiers.outgoingDamageBonusPercent,
        resilienceMultiplier: modifiers.factionResilienceDamageMultiplier,
        capeReductionPct: result.dungeonDamageReductionPercent,
      };
    })
  ));
}

type FavorableRow = ReturnType<typeof runFavorableFactionMatrix>[number];

function summarizeByWeapon(rows: readonly FavorableRow[]) {
  return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
    const weaponRows = rows.filter((row) => row.family === weapon.family && row.weapon === weapon.label);
    const clears = weaponRows.filter((row) => row.clear).length;
    return {
      family: weapon.family,
      weapon: weapon.label,
      faction: weaponRows[0]?.faction ?? "missing",
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

function summarizeByContext(rows: readonly FavorableRow[]) {
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
      avgDps: Number((contextRows.reduce((sum, row) => sum + row.dps, 0) / contextRows.length).toFixed(1)),
      avgIncomingDps: Number((contextRows.reduce((sum, row) => sum + row.incomingDps, 0) / contextRows.length).toFixed(1)),
    };
  }));
}

describe("Tower favorable faction matchup benchmark", () => {
  it("benchmarks every artifact specialization with the full live favorable faction package", () => {
    const rows = runFavorableFactionMatrix();
    const weaponSummary = summarizeByWeapon(rows);
    const contextSummary = summarizeByContext(rows);

    console.log("[TOWER_FAVORABLE_FACTION_ALL_WEAPONS]");
    console.table(rows);
    console.log("[TOWER_FAVORABLE_FACTION_WEAPON_SUMMARY]");
    console.table(weaponSummary);
    console.log("[TOWER_FAVORABLE_FACTION_CONTEXT_SUMMARY]");
    console.table(contextSummary);
    console.log("[TOWER_FAVORABLE_FACTION_NOTE] Tower faction normalization is active. Each weapon fights only its canonical favorable faction with authored anti-faction damage, the matching faction cape, and Tower Faction Resilience including the matched-weapon resilience ignore. No weapon tuning is applied by this benchmark.");

    expect(rows).toHaveLength(ARTIFACT_WEAPON_BENCHMARK_SPECS.length * BENCHMARK_TIERS.length);
    expect(rows.every((row) => row.outgoingBonusPct > 0)).toBe(true);
    expect(rows.every((row) => row.resilienceMultiplier === 0.9)).toBe(true);
    expect(rows.every((row) => row.capeReductionPct > 0)).toBe(true);
    expect(weaponSummary.every((row) => row.runs === BENCHMARK_TIERS.length)).toBe(true);
    expect(contextSummary.every((row) => row.runs === 5)).toBe(true);
  });
});
