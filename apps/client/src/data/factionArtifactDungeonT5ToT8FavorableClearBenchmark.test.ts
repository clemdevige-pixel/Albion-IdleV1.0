import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
  type ArtifactBenchmarkTier,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import {
  resolveArtifactDungeonDamageBonusPercent,
  resolveWeaponArtifactFaction,
} from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TIERS = [5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const ZONE_BY_TIER = {
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

const round1 = (value: number): number => Number(value.toFixed(1));

describe("T5-T8 artifact favorable dungeon clear benchmark", () => {
  it("measures prepared same-tier .3 artifact weapons in their favorable faction dungeon", () => {
    const rows = TIERS.flatMap((tier) => {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      const mastery = artifactBenchmarkMasteryProfile(tier);

      return ARTIFACT_WEAPON_BENCHMARK_SPECS.map((weapon) => {
        const itemId = weapon.itemId(tier);
        const artifactFaction = resolveWeaponArtifactFaction(itemId);
        const dungeon = dungeons.find(
          (candidate) => resolveArtifactDungeonDamageBonusPercent(itemId, candidate.faction) === 20,
        );

        expect(artifactFaction).toBeDefined();
        expect(dungeon).toBeDefined();

        const favorableDungeon = dungeon!;
        const bonusPct = resolveArtifactDungeonDamageBonusPercent(itemId, favorableDungeon.faction);
        const result = runCombatRuntimeBenchmark({
          label: `artifact_dungeon_favorable_t${tier}_${weapon.label}_${favorableDungeon.id}`,
          weaponItemId: itemId,
          equipmentItemIds: artifactDungeonEquipment(itemId, tier, favorableDungeon.faction),
          zoneDefId: ZONE_BY_TIER[tier],
          segmentIndex: 9,
          dungeonDefinitionId: favorableDungeon.id,
          enchantment: 3,
          ...mastery,
          useHealthPotions: true,
          heroDamageMultiplier: 1 + bonusPct / 100,
        });

        const boss = result.encounters.at(-1);
        return {
          tier,
          family: weapon.family,
          weapon: weapon.label,
          artifactFaction,
          dungeon: favorableDungeon.id,
          enemyFaction: favorableDungeon.faction,
          bonusPct,
          familyMastery: mastery.familyMasteryLevel,
          specMastery: mastery.specializationMasteryLevel,
          siblingMastery: mastery.siblingSpecializationMasteryLevel,
          clear: result.clear,
          encounterReached: result.encounterReached,
          bossProgressPct: round1(result.bossProgressPercent),
          bossEntryHpPct: round1(boss?.hpBeforePercent ?? 0),
          seconds: round1(result.seconds),
          hpPct: round1(result.hpPercent),
          potions: result.potionsUsed,
          dps: round1(result.observedDps),
          damageReceived: round1(result.damageReceived),
        };
      });
    });

    const byTierFaction = TIERS.flatMap((tier) => {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      return dungeons.map((dungeon) => {
        const dungeonRows = rows.filter((row) => row.tier === tier && row.dungeon === dungeon.id);
        const clears = dungeonRows.filter((row) => row.clear);
        return {
          tier,
          dungeon: dungeon.id,
          faction: dungeon.faction,
          weapons: dungeonRows.length,
          clears: clears.length,
          clearRatePct: round1((clears.length / dungeonRows.length) * 100),
          avgBossProgressPct: round1(
            dungeonRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / dungeonRows.length,
          ),
          minBossProgressPct: round1(Math.min(...dungeonRows.map((row) => row.bossProgressPct))),
          avgBossEntryHpPct: round1(
            dungeonRows.reduce((sum, row) => sum + row.bossEntryHpPct, 0) / dungeonRows.length,
          ),
          avgDps: round1(dungeonRows.reduce((sum, row) => sum + row.dps, 0) / dungeonRows.length),
          avgPotions: round1(dungeonRows.reduce((sum, row) => sum + row.potions, 0) / dungeonRows.length),
          avgClearHpPct: clears.length > 0
            ? round1(clears.reduce((sum, row) => sum + row.hpPct, 0) / clears.length)
            : 0,
        };
      });
    });

    const byTier = TIERS.map((tier) => {
      const tierRows = rows.filter((row) => row.tier === tier);
      const clears = tierRows.filter((row) => row.clear);
      return {
        tier,
        weapons: tierRows.length,
        clears: clears.length,
        clearRatePct: round1((clears.length / tierRows.length) * 100),
        avgBossProgressPct: round1(tierRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / tierRows.length),
        minBossProgressPct: round1(Math.min(...tierRows.map((row) => row.bossProgressPct))),
        avgDps: round1(tierRows.reduce((sum, row) => sum + row.dps, 0) / tierRows.length),
      };
    });

    console.log("[FACTION_ARTIFACT_T5_T8_FAVORABLE_DUNGEON_ROWS]");
    console.table(rows);
    console.log("[FACTION_ARTIFACT_T5_T8_FAVORABLE_DUNGEON_BY_TIER_FACTION]");
    console.table(byTierFaction);
    console.log("[FACTION_ARTIFACT_T5_T8_FAVORABLE_DUNGEON_BY_TIER]");
    console.table(byTier);

    expect(rows).toHaveLength(TIERS.length * ARTIFACT_WEAPON_BENCHMARK_SPECS.length);
    expect(rows.every((row) => row.bonusPct === 20)).toBe(true);
    expect(rows.every((row) => row.encounterReached === 4)).toBe(true);
    expect(byTierFaction.every((row) => row.weapons === 5)).toBe(true);
  });
});
