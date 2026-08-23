import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import {
  ARTIFACT_BENCHMARK_MASTERY_PROFILE,
  T4_ARTIFACT_WEAPONS,
  t4ArtifactDungeonEquipment,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import {
  resolveArtifactDungeonDamageBonusPercent,
  resolveWeaponArtifactFaction,
} from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const round1 = (value: number): number => Number(value.toFixed(1));

describe("T4 artifact favorable dungeon clear benchmark", () => {
  it("measures the player-facing favorable matchup with cape, health potions and branch mastery IP", () => {
    const t4Dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === 4);

    const rows = T4_ARTIFACT_WEAPONS.map((weapon) => {
      const artifactFaction = resolveWeaponArtifactFaction(weapon.itemId);
      const dungeon = t4Dungeons.find(
        (candidate) => resolveArtifactDungeonDamageBonusPercent(weapon.itemId, candidate.faction) === 20,
      );

      expect(artifactFaction).toBeDefined();
      expect(dungeon).toBeDefined();

      const favorableDungeon = dungeon!;
      const bonusPct = resolveArtifactDungeonDamageBonusPercent(weapon.itemId, favorableDungeon.faction);
      const result = runCombatRuntimeBenchmark({
        label: `artifact_dungeon_favorable_${weapon.label}_${favorableDungeon.id}`,
        weaponItemId: weapon.itemId,
        equipmentItemIds: t4ArtifactDungeonEquipment(weapon.itemId, favorableDungeon.faction),
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: 9,
        dungeonDefinitionId: favorableDungeon.id,
        enchantment: 3,
        ...ARTIFACT_BENCHMARK_MASTERY_PROFILE,
        useHealthPotions: true,
        heroDamageMultiplier: 1 + bonusPct / 100,
      });

      const boss = result.encounters.at(-1);
      return {
        family: weapon.family,
        weapon: weapon.label,
        artifactFaction,
        dungeon: favorableDungeon.id,
        enemyFaction: favorableDungeon.faction,
        bonusPct,
        familyMastery: ARTIFACT_BENCHMARK_MASTERY_PROFILE.familyMasteryLevel,
        specMastery: ARTIFACT_BENCHMARK_MASTERY_PROFILE.specializationMasteryLevel,
        siblingMastery: ARTIFACT_BENCHMARK_MASTERY_PROFILE.siblingSpecializationMasteryLevel,
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

    const byDungeon = t4Dungeons.map((dungeon) => {
      const dungeonRows = rows.filter((row) => row.dungeon === dungeon.id);
      const clears = dungeonRows.filter((row) => row.clear);
      return {
        dungeon: dungeon.id,
        faction: dungeon.faction,
        weapons: dungeonRows.length,
        clears: clears.length,
        clearRatePct: round1((clears.length / dungeonRows.length) * 100),
        avgBossProgressPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / dungeonRows.length,
        ),
        minBossProgressPct: round1(Math.min(...dungeonRows.map((row) => row.bossProgressPct))),
        maxBossProgressPct: round1(Math.max(...dungeonRows.map((row) => row.bossProgressPct))),
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

    const byFamily = (["sword", "bow", "fire_staff", "gloves", "dagger"] as const).map((family) => {
      const familyRows = rows.filter((row) => row.family === family);
      const clears = familyRows.filter((row) => row.clear);
      return {
        family,
        weapons: familyRows.length,
        clears: clears.length,
        clearRatePct: round1((clears.length / familyRows.length) * 100),
        avgBossProgressPct: round1(
          familyRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / familyRows.length,
        ),
        avgDps: round1(familyRows.reduce((sum, row) => sum + row.dps, 0) / familyRows.length),
      };
    });

    console.log("[FACTION_ARTIFACT_T4_FAVORABLE_DUNGEON_ROWS]");
    console.table(rows);
    console.log("[FACTION_ARTIFACT_T4_FAVORABLE_DUNGEON_BY_DUNGEON]");
    console.table(byDungeon);
    console.log("[FACTION_ARTIFACT_T4_FAVORABLE_DUNGEON_BY_FAMILY]");
    console.table(byFamily);

    expect(rows).toHaveLength(T4_ARTIFACT_WEAPONS.length);
    expect(rows.every((row) => row.bonusPct === 20)).toBe(true);
    expect(rows.every((row) => row.encounterReached === 4)).toBe(true);
    expect(byDungeon.every((row) => row.weapons === 5)).toBe(true);
    expect(byFamily.every((row) => row.weapons === 4)).toBe(true);
  });
});
