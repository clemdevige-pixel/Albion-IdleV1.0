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
const round2 = (value: number): number => Number(value.toFixed(2));

describe("T4 artifact dungeon faction bonus A/B benchmark", () => {
  it("isolates the canonical +20% favorable matchup from dungeon difficulty", () => {
    const t4Dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === 4);
    const rows = T4_ARTIFACT_WEAPONS.map((weapon) => {
      const artifactFaction = resolveWeaponArtifactFaction(weapon.itemId);
      const favorableDungeon = t4Dungeons.find(
        (dungeon) => resolveArtifactDungeonDamageBonusPercent(weapon.itemId, dungeon.faction) === 20,
      );

      expect(artifactFaction).toBeDefined();
      expect(favorableDungeon).toBeDefined();

      const dungeon = favorableDungeon!;
      const equipmentItemIds = t4ArtifactDungeonEquipment(weapon.itemId, dungeon.faction);
      const common = {
        weaponItemId: weapon.itemId,
        equipmentItemIds,
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: 9,
        dungeonDefinitionId: dungeon.id,
        enchantment: 3,
        ...ARTIFACT_BENCHMARK_MASTERY_PROFILE,
        // Potions are intentionally disabled here. Their cooldown/threshold timing
        // can change when a +20% damage run shortens combat, which would mix
        // survivability cadence into what must be a strict damage-bonus A/B probe.
        useHealthPotions: false,
      } as const;

      const withoutBonus = runCombatRuntimeBenchmark({
        ...common,
        label: `artifact_dungeon_ab_off_${weapon.label}_${dungeon.id}`,
        heroDamageMultiplier: 1,
      });
      const withBonus = runCombatRuntimeBenchmark({
        ...common,
        label: `artifact_dungeon_ab_on_${weapon.label}_${dungeon.id}`,
        heroDamageMultiplier: 1.2,
      });

      const offBoss = withoutBonus.encounters.at(-1);
      const onBoss = withBonus.encounters.at(-1);

      return {
        family: weapon.family,
        weapon: weapon.label,
        artifactFaction,
        dungeon: dungeon.id,
        enemyFaction: dungeon.faction,
        familyMastery: ARTIFACT_BENCHMARK_MASTERY_PROFILE.familyMasteryLevel,
        specMastery: ARTIFACT_BENCHMARK_MASTERY_PROFILE.specializationMasteryLevel,
        siblingMastery: ARTIFACT_BENCHMARK_MASTERY_PROFILE.siblingSpecializationMasteryLevel,
        offClear: withoutBonus.clear,
        onClear: withBonus.clear,
        offEncounterReached: withoutBonus.encounterReached,
        onEncounterReached: withBonus.encounterReached,
        offProgressPct: round1(withoutBonus.bossProgressPercent),
        onProgressPct: round1(withBonus.bossProgressPercent),
        progressDeltaPct: round1(withBonus.bossProgressPercent - withoutBonus.bossProgressPercent),
        offBossEntryHpPct: round1(offBoss?.hpBeforePercent ?? 0),
        onBossEntryHpPct: round1(onBoss?.hpBeforePercent ?? 0),
        bossEntryHpDeltaPct: round1((onBoss?.hpBeforePercent ?? 0) - (offBoss?.hpBeforePercent ?? 0)),
        offDps: round1(withoutBonus.observedDps),
        onDps: round1(withBonus.observedDps),
        dpsRatio: withoutBonus.observedDps > 0 ? round2(withBonus.observedDps / withoutBonus.observedDps) : null,
        offSeconds: round1(withoutBonus.seconds),
        onSeconds: round1(withBonus.seconds),
        offHpPct: round1(withoutBonus.hpPercent),
        onHpPct: round1(withBonus.hpPercent),
      };
    });

    const byDungeon = t4Dungeons.map((dungeon) => {
      const dungeonRows = rows.filter((row) => row.dungeon === dungeon.id);
      return {
        dungeon: dungeon.id,
        faction: dungeon.faction,
        weapons: dungeonRows.length,
        offClears: dungeonRows.filter((row) => row.offClear).length,
        onClears: dungeonRows.filter((row) => row.onClear).length,
        avgOffProgressPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.offProgressPct, 0) / dungeonRows.length,
        ),
        avgOnProgressPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.onProgressPct, 0) / dungeonRows.length,
        ),
        avgProgressDeltaPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.progressDeltaPct, 0) / dungeonRows.length,
        ),
        avgBossEntryHpDeltaPct: round1(
          dungeonRows.reduce((sum, row) => sum + row.bossEntryHpDeltaPct, 0) / dungeonRows.length,
        ),
        avgDpsRatio: round2(
          dungeonRows.reduce((sum, row) => sum + (row.dpsRatio ?? 0), 0) / dungeonRows.length,
        ),
      };
    });

    console.log("[FACTION_ARTIFACT_T4_DUNGEON_BONUS_AB_ROWS]");
    console.table(rows);
    console.log("[FACTION_ARTIFACT_T4_DUNGEON_BONUS_AB_BY_DUNGEON]");
    console.table(byDungeon);

    expect(rows).toHaveLength(T4_ARTIFACT_WEAPONS.length);
    expect(rows.every((row) => row.dpsRatio !== null && row.dpsRatio >= 1)).toBe(true);
    // Boss-only progress is diagnostic, not monotonic: faster trash clears alter
    // cooldown state and HP at boss entry. The strict invariant is that +20%
    // never makes the run reach an earlier encounter.
    expect(rows.every((row) => row.onEncounterReached >= row.offEncounterReached)).toBe(true);
    expect(byDungeon.every((row) => row.weapons === 5)).toBe(true);
  });
});
