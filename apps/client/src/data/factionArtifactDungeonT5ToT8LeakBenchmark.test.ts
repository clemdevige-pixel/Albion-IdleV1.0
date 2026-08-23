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
} from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TIERS = [5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const ZONE_BY_TIER = {
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

const BASE_WEAPONS = [
  { family: "sword", label: "Broadsword", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_sword_t${tier}_broadsword` },
  { family: "bow", label: "Longbow", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_bow_t${tier}_longbow` },
  { family: "fire_staff", label: "Infernal Staff", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_staff_t${tier}_infernal` },
  { family: "gloves", label: "Spiked Gauntlets", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_gloves_t${tier}_spiked_gauntlets` },
  { family: "dagger", label: "Dagger Pair", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_dagger_t${tier}_pair` },
] as const;

const round1 = (value: number): number => Number(value.toFixed(1));

describe("T5-T8 dungeon progression leak benchmark", () => {
  it("measures base weapons and neutral artifact matchups with branch mastery IP", () => {
    const baseRows = TIERS.flatMap((tier) => {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      const mastery = artifactBenchmarkMasteryProfile(tier);
      return BASE_WEAPONS.flatMap((weapon) => {
        const itemId = weapon.itemId(tier);
        return dungeons.map((dungeon) => {
          const result = runCombatRuntimeBenchmark({
            label: `base_dungeon_t${tier}_${weapon.label}_${dungeon.id}`,
            weaponItemId: itemId,
            equipmentItemIds: artifactDungeonEquipment(itemId, tier, dungeon.faction),
            zoneDefId: ZONE_BY_TIER[tier],
            segmentIndex: 9,
            dungeonDefinitionId: dungeon.id,
            enchantment: 3,
            ...mastery,
            useHealthPotions: true,
          });
          return {
            tier,
            family: weapon.family,
            weapon: weapon.label,
            dungeon: dungeon.id,
            enemyFaction: dungeon.faction,
            clear: result.clear,
            bossProgressPct: round1(result.bossProgressPercent),
            seconds: round1(result.seconds),
            hpPct: round1(result.hpPercent),
            potions: result.potionsUsed,
            dps: round1(result.observedDps),
          };
        });
      });
    });

    const neutralArtifactRows = TIERS.flatMap((tier) => {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      const mastery = artifactBenchmarkMasteryProfile(tier);
      return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => {
        const itemId = weapon.itemId(tier);
        return dungeons
          .filter((dungeon) => resolveArtifactDungeonDamageBonusPercent(itemId, dungeon.faction) === 0)
          .map((dungeon) => {
            const result = runCombatRuntimeBenchmark({
              label: `artifact_neutral_t${tier}_${weapon.label}_${dungeon.id}`,
              weaponItemId: itemId,
              equipmentItemIds: artifactDungeonEquipment(itemId, tier, dungeon.faction),
              zoneDefId: ZONE_BY_TIER[tier],
              segmentIndex: 9,
              dungeonDefinitionId: dungeon.id,
              enchantment: 3,
              ...mastery,
              useHealthPotions: true,
              heroDamageMultiplier: 1,
            });
            return {
              tier,
              family: weapon.family,
              weapon: weapon.label,
              dungeon: dungeon.id,
              enemyFaction: dungeon.faction,
              clear: result.clear,
              bossProgressPct: round1(result.bossProgressPercent),
              seconds: round1(result.seconds),
              hpPct: round1(result.hpPercent),
              potions: result.potionsUsed,
              dps: round1(result.observedDps),
            };
          });
      });
    });

    const baseByTierFaction = TIERS.flatMap((tier) => DUNGEON_DEFINITIONS
      .filter((dungeon) => dungeon.tier === tier)
      .map((dungeon) => {
        const rows = baseRows.filter((row) => row.tier === tier && row.dungeon === dungeon.id);
        const clears = rows.filter((row) => row.clear);
        return {
          tier,
          dungeon: dungeon.id,
          faction: dungeon.faction,
          clears: `${clears.length}/${rows.length}`,
          clearRatePct: round1((clears.length / rows.length) * 100),
          avgBossProgressPct: round1(rows.reduce((sum, row) => sum + row.bossProgressPct, 0) / rows.length),
          minBossProgressPct: round1(Math.min(...rows.map((row) => row.bossProgressPct))),
          maxBossProgressPct: round1(Math.max(...rows.map((row) => row.bossProgressPct))),
        };
      }));

    const neutralByTierFaction = TIERS.flatMap((tier) => DUNGEON_DEFINITIONS
      .filter((dungeon) => dungeon.tier === tier)
      .map((dungeon) => {
        const rows = neutralArtifactRows.filter((row) => row.tier === tier && row.dungeon === dungeon.id);
        const clears = rows.filter((row) => row.clear);
        return {
          tier,
          dungeon: dungeon.id,
          faction: dungeon.faction,
          weapons: rows.length,
          clears: clears.length,
          clearRatePct: round1((clears.length / rows.length) * 100),
          avgBossProgressPct: round1(rows.reduce((sum, row) => sum + row.bossProgressPct, 0) / rows.length),
          minBossProgressPct: round1(Math.min(...rows.map((row) => row.bossProgressPct))),
          maxBossProgressPct: round1(Math.max(...rows.map((row) => row.bossProgressPct))),
        };
      }));

    const neutralByTier = TIERS.map((tier) => {
      const rows = neutralArtifactRows.filter((row) => row.tier === tier);
      const clears = rows.filter((row) => row.clear);
      return {
        tier,
        runs: rows.length,
        clears: clears.length,
        clearRatePct: round1((clears.length / rows.length) * 100),
        avgBossProgressPct: round1(rows.reduce((sum, row) => sum + row.bossProgressPct, 0) / rows.length),
      };
    });

    console.log("[DUNGEON_T5_T8_BASE_WEAPON_ROWS]");
    console.table(baseRows);
    console.log("[DUNGEON_T5_T8_BASE_BY_TIER_FACTION]");
    console.table(baseByTierFaction);
    console.log("[DUNGEON_T5_T8_NEUTRAL_ARTIFACT_ROWS]");
    console.table(neutralArtifactRows);
    console.log("[DUNGEON_T5_T8_NEUTRAL_ARTIFACT_BY_TIER_FACTION]");
    console.table(neutralByTierFaction);
    console.log("[DUNGEON_T5_T8_NEUTRAL_ARTIFACT_BY_TIER]");
    console.table(neutralByTier);

    expect(baseRows).toHaveLength(TIERS.length * BASE_WEAPONS.length * 4);
    expect(neutralArtifactRows).toHaveLength(TIERS.length * ARTIFACT_WEAPON_BENCHMARK_SPECS.length * 3);
    expect(neutralArtifactRows.every((row) => Number.isFinite(row.dps))).toBe(true);
    expect(neutralByTierFaction.every((row) => row.weapons === 15)).toBe(true);
  });
});
