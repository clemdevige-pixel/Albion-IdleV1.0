import { describe, expect, it } from "vitest";
import { type TowerFactionId, type TowerTier } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCapeDungeonDamageReductionPercent } from "./factionCapeContentCatalog.js";
import { resolveTowerDifficultyZeroEncounter } from "./towerEncounterResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TOWER_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly TowerTier[];
const TOWER_FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const satisfies readonly TowerFactionId[];
const TOWER_WEAPON_ENCHANTMENT = 4 as const;
const TOWER_EQUIPMENT_ENCHANTMENT = 3 as const;
const TOWER_POTION_STOCK = 99;
const TOWER_EARLY_AWAKENING_STRAIN = 10;
// At strain 10, slot 2 has just unlocked. A player can realistically have one
// trait filled + nine improvements. Item Power rolls 1-2 per modification, so
// 15 IP is the midpoint of the non-critical 10-modification reachable range 10-20.
const TOWER_EARLY_AWAKENING_ITEM_POWER = 15;

const round1 = (value: number): number => Number(value.toFixed(1));

function resolveDifficultyZeroBlock(tier: TowerTier, factionId: TowerFactionId) {
  return Array.from({ length: 5 }, (_, indexInBlock) => {
    const encounter = resolveTowerDifficultyZeroEncounter(tier, factionId, indexInBlock);
    return {
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: encounter.combatProfile,
    };
  });
}

describe("Tower difficulty-zero base curve benchmark", () => {
  it("benchmarks every favorable weapon across every tier and faction before trial/depth scaling", () => {
    const rows = TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.flatMap((factionId) => {
      const dungeon = DUNGEON_DEFINITIONS.find((definition) => (
        definition.tier === tier && definition.faction.toLowerCase() === factionId
      ));
      if (dungeon === undefined) throw new Error(`Missing Dungeon source for ${factionId} T${String(tier)}`);

      const authoredEncounters = resolveDifficultyZeroBlock(tier, factionId);
      const mastery = artifactBenchmarkMasteryProfile(tier);
      const capeItemId = `item_cape_t${String(tier)}_${factionId}`;
      const incomingDamageReductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
        capeItemId,
        { factionId, tier },
      );

      return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => {
        const weaponItemId = weapon.itemId(tier);
        const bonusPct = resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction);
        if (bonusPct <= 0) return [];

        const result = runCombatRuntimeBenchmark({
          label: `tower_difficulty_zero_t${String(tier)}_${factionId}_${weapon.family}_${weapon.label}`,
          weaponItemId,
          equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, factionId),
          zoneDefId: WORLD_ZONE_IDS.mountain,
          segmentIndex: 9,
          authoredEncounters,
          enchantment: TOWER_WEAPON_ENCHANTMENT,
          equipmentEnchantment: TOWER_EQUIPMENT_ENCHANTMENT,
          awakenedWeapon: {
            strain: TOWER_EARLY_AWAKENING_STRAIN,
            traits: [{ traitId: "item_power", value: TOWER_EARLY_AWAKENING_ITEM_POWER }],
          },
          familyMasteryLevel: mastery.familyMasteryLevel,
          specializationMasteryLevel: mastery.specializationMasteryLevel,
          siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
          useHealthPotions: true,
          healthPotionQuantity: TOWER_POTION_STOCK,
          heroDamageMultiplier: 1 + bonusPct / 100,
          incomingDamageReductionPercent,
        });
        const failedEncounter = result.encounters.find((encounter) => !encounter.cleared);

        return [{
          tier,
          faction: factionId,
          family: weapon.family,
          weapon: weapon.label,
          bonusPct,
          strain: TOWER_EARLY_AWAKENING_STRAIN,
          awakenedItemPower: TOWER_EARLY_AWAKENING_ITEM_POWER,
          clear: result.clear,
          hpPct: round1(result.hpPercent),
          seconds: round1(result.seconds),
          potions: result.potionsUsed,
          encounterReached: result.encounterReached,
          failedFloorInBlock: failedEncounter?.encounterIndex ?? null,
          failedFloorProgressPct: failedEncounter === undefined
            ? 100
            : round1(failedEncounter.encounterProgressPercent),
          enemyHpRemainingPct: round1(result.enemyHpRemainingPercent),
        }];
      });
    }));

    const summary = TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.map((faction) => {
      const factionRows = rows.filter((row) => row.tier === tier && row.faction === faction);
      const clears = factionRows.filter((row) => row.clear);
      return {
        tier,
        faction,
        favorableWeapons: factionRows.length,
        clears: `${String(clears.length)}/${String(factionRows.length)}`,
        minClearHpPct: clears.length === 0 ? null : Math.min(...clears.map((row) => row.hpPct)),
        maxClearHpPct: clears.length === 0 ? null : Math.max(...clears.map((row) => row.hpPct)),
        maxPotionsUsed: factionRows.length === 0 ? null : Math.max(...factionRows.map((row) => row.potions)),
      };
    }));

    console.log("[TOWER_DIFFICULTY_ZERO_REFERENCE]", {
      encounterSource: "resolveTowerDifficultyZeroEncounter",
      difficulty: 0,
      trialBlockTuning: false,
      depthScaling: false,
      weaponEnchantment: TOWER_WEAPON_ENCHANTMENT,
      equipmentEnchantment: TOWER_EQUIPMENT_ENCHANTMENT,
      awakenedStrain: TOWER_EARLY_AWAKENING_STRAIN,
      awakenedTraits: [{ traitId: "item_power", value: TOWER_EARLY_AWAKENING_ITEM_POWER }],
      potionStock: TOWER_POTION_STOCK,
      potionPolicy: "shared CombatRuntime threshold/cooldown; no Tower-specific cap",
      favorableMatchupsOnly: true,
    });
    console.log("[TOWER_DIFFICULTY_ZERO_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_DIFFICULTY_ZERO_MATRIX]");
    console.table(rows);
    console.log("[TOWER_DIFFICULTY_ZERO_FAILURES]");
    console.table(rows.filter((row) => !row.clear));

    expect(summary).toHaveLength(20);
    expect(rows).toHaveLength(100);
    expect(summary.every((entry) => entry.favorableWeapons === 5)).toBe(true);
  });
});
