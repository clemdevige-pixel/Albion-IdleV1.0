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
const TOWER_EARLY_AWAKENING_ITEM_POWER = 15;
const DIFFICULTY_PCTS = Array.from({ length: 21 }, (_, index) => index);
const SIGNIFICANT_HP_INVERSION_PCT = 3;

interface ScalingModel {
  readonly id: string;
  readonly hpRate: number;
  readonly damageRate: number;
}

const SCALING_MODELS = [
  { id: "hp1.00_damage1.00", hpRate: 1, damageRate: 1 },
  { id: "hp1.00_damage1.10", hpRate: 1, damageRate: 1.1 },
  { id: "hp1.00_damage1.15", hpRate: 1, damageRate: 1.15 },
  { id: "hp1.00_damage1.20", hpRate: 1, damageRate: 1.2 },
  { id: "hp0.90_damage1.10", hpRate: 0.9, damageRate: 1.1 },
] as const satisfies readonly ScalingModel[];

const round1 = (value: number): number => Number(value.toFixed(1));
const round3 = (value: number): number => Number(value.toFixed(3));

function scaleProfile(
  profile: ReturnType<typeof resolveTowerDifficultyZeroEncounter>["combatProfile"],
  difficultyPct: number,
  model: ScalingModel,
) {
  const hpMultiplier = 1 + (difficultyPct / 100) * model.hpRate;
  const damageMultiplier = 1 + (difficultyPct / 100) * model.damageRate;
  return {
    hp: Math.round(profile.hp * hpMultiplier),
    damage: Math.round(profile.damage * damageMultiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * hpMultiplier),
    magicResistance: Math.round(profile.magicResistance * hpMultiplier),
  };
}

function resolveScaledBlock(
  tier: TowerTier,
  factionId: TowerFactionId,
  difficultyPct: number,
  model: ScalingModel,
) {
  return Array.from({ length: 5 }, (_, indexInBlock) => {
    const encounter = resolveTowerDifficultyZeroEncounter(tier, factionId, indexInBlock);
    return {
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: scaleProfile(encounter.combatProfile, difficultyPct, model),
    };
  });
}

function runOne(
  tier: TowerTier,
  factionId: TowerFactionId,
  weapon: (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number],
  difficultyPct: number,
  model: ScalingModel,
) {
  const dungeon = DUNGEON_DEFINITIONS.find((definition) => (
    definition.tier === tier && definition.faction.toLowerCase() === factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for ${factionId} T${String(tier)}`);

  const weaponItemId = weapon.itemId(tier);
  const bonusPct = resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction);
  if (bonusPct <= 0) return undefined;

  const mastery = artifactBenchmarkMasteryProfile(tier);
  const capeItemId = `item_cape_t${String(tier)}_${factionId}`;
  const incomingDamageReductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
    capeItemId,
    { factionId, tier },
  );

  const result = runCombatRuntimeBenchmark({
    label: `tower_scaling_${model.id}_t${String(tier)}_${factionId}_${weapon.family}_${weapon.label}_p${String(difficultyPct)}`,
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, factionId),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    authoredEncounters: resolveScaledBlock(tier, factionId, difficultyPct, model),
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

  const boss = result.encounters[4];
  return {
    model: model.id,
    tier,
    faction: factionId,
    weapon: weapon.label,
    difficultyPct,
    clear: result.clear,
    hpPct: round1(result.hpPercent),
    totalPotions: result.potionsUsed,
    bossPotions: boss?.potionsUsed ?? 0,
    bossSeconds: round1(boss?.seconds ?? 0),
    bossDps: round1(boss?.observedDps ?? 0),
  };
}

describe("Tower HP / damage scaling model benchmark", () => {
  it("compares candidate Endless scaling ratios on the same favorable matchups", () => {
    const rows = SCALING_MODELS.flatMap((model) => TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.flatMap((faction) => (
      ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => DIFFICULTY_PCTS.flatMap((difficultyPct) => {
        const row = runOne(tier, faction, weapon, difficultyPct, model);
        return row === undefined ? [] : [row];
      }))
    ))));

    const modelSummaries = SCALING_MODELS.map((model) => {
      const modelRows = rows.filter((row) => row.model === model.id);
      const matchupKeys = [...new Set(modelRows.map((row) => `${row.weapon}|${String(row.tier)}|${row.faction}`))];
      const inversions = matchupKeys.flatMap((key) => {
        const series = modelRows
          .filter((row) => `${row.weapon}|${String(row.tier)}|${row.faction}` === key)
          .sort((a, b) => a.difficultyPct - b.difficultyPct);
        return series.slice(1).flatMap((current, index) => {
          const previous = series[index]!;
          if (!previous.clear || !current.clear) return [];
          const hpGainPct = round1(current.hpPct - previous.hpPct);
          if (hpGainPct < SIGNIFICANT_HP_INVERSION_PCT) return [];
          return [{
            model: model.id,
            tier: current.tier,
            faction: current.faction,
            weapon: current.weapon,
            fromPct: previous.difficultyPct,
            toPct: current.difficultyPct,
            hpGainPct,
            potionDelta: current.totalPotions - previous.totalPotions,
            bossPotionDelta: current.bossPotions - previous.bossPotions,
          }];
        });
      });

      const potionLinked = inversions.filter((row) => row.potionDelta > 0 || row.bossPotionDelta > 0);
      const firstFailures = matchupKeys.map((key) => {
        const series = modelRows
          .filter((row) => `${row.weapon}|${String(row.tier)}|${row.faction}` === key)
          .sort((a, b) => a.difficultyPct - b.difficultyPct);
        return series.find((row) => !row.clear)?.difficultyPct ?? 21;
      });
      const baselineClears = modelRows.filter((row) => row.difficultyPct === 0 && row.clear).length;
      const clearsAt20 = modelRows.filter((row) => row.difficultyPct === 20 && row.clear).length;
      return {
        model: model.id,
        hpRate: model.hpRate,
        damageRate: model.damageRate,
        baselineClears: `${String(baselineClears)}/100`,
        clearsAt20: `${String(clearsAt20)}/100`,
        significantInversions: inversions.length,
        potionLinkedInversions: potionLinked.length,
        largestHpGainPct: round1(Math.max(0, ...inversions.map((row) => row.hpGainPct))),
        largestPotionLinkedHpGainPct: round1(Math.max(0, ...potionLinked.map((row) => row.hpGainPct))),
        avgFirstFailurePct: round1(firstFailures.reduce((sum, value) => sum + value, 0) / firstFailures.length),
        medianFirstFailurePct: [...firstFailures].sort((a, b) => a - b)[Math.floor(firstFailures.length / 2)] ?? 0,
      };
    });

    const scoreRows = modelSummaries.map((row) => ({
      ...row,
      coherenceScore: round3(
        row.potionLinkedInversions * 10
        + row.largestPotionLinkedHpGainPct * 2
        + row.significantInversions
        + Math.max(0, 12 - row.avgFirstFailurePct) * 3,
      ),
    })).sort((a, b) => a.coherenceScore - b.coherenceScore);

    console.log("[TOWER_HP_DAMAGE_SCALING_MODEL_REFERENCE]", {
      difficultyRangePct: "0..20",
      stepPct: 1,
      defensesScaleWith: "hpRate",
      significantHpInversionPct: SIGNIFICANT_HP_INVERSION_PCT,
      potionRules: "live runtime",
      baseline: ".4 weapon, .3 equipment, strain 10 + 15 Item Power, favorable faction matchup",
      note: "coherenceScore is diagnostic only; lower is better and weights potion-linked inversions most heavily",
    });
    console.log("[TOWER_HP_DAMAGE_SCALING_MODEL_SUMMARY]");
    console.table(modelSummaries);
    console.log("[TOWER_HP_DAMAGE_SCALING_MODEL_RANKING]");
    console.table(scoreRows);

    expect(rows).toHaveLength(SCALING_MODELS.length * 2100);
    expect(modelSummaries).toHaveLength(SCALING_MODELS.length);
    expect(modelSummaries.every((row) => row.baselineClears === "100/100")).toBe(true);
  });
});
