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
const DIFFICULTY_STEPS = Array.from({ length: 21 }, (_, index) => Number((1 + index / 100).toFixed(2)));
const SIGNIFICANT_HP_INVERSION_PCT = 3;

const round1 = (value: number): number => Number(value.toFixed(1));

function scaleProfile(
  profile: ReturnType<typeof resolveTowerDifficultyZeroEncounter>["combatProfile"],
  multiplier: number,
) {
  return {
    hp: Math.round(profile.hp * multiplier),
    damage: Math.round(profile.damage * multiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * multiplier),
    magicResistance: Math.round(profile.magicResistance * multiplier),
  };
}

function resolveScaledBlock(tier: TowerTier, factionId: TowerFactionId, multiplier: number) {
  return Array.from({ length: 5 }, (_, indexInBlock) => {
    const encounter = resolveTowerDifficultyZeroEncounter(tier, factionId, indexInBlock);
    return {
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: scaleProfile(encounter.combatProfile, multiplier),
    };
  });
}

function runOne(
  tier: TowerTier,
  factionId: TowerFactionId,
  weapon: (typeof ARTIFACT_WEAPON_BENCHMARK_SPECS)[number],
  multiplier: number,
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
    label: `tower_monotonicity_t${String(tier)}_${factionId}_${weapon.family}_${weapon.label}_x${multiplier.toFixed(2)}`,
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, factionId),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    authoredEncounters: resolveScaledBlock(tier, factionId, multiplier),
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
    tier,
    faction: factionId,
    family: weapon.family,
    weapon: weapon.label,
    multiplier,
    difficultyPct: Math.round((multiplier - 1) * 100),
    clear: result.clear,
    hpPct: round1(result.hpPercent),
    seconds: round1(result.seconds),
    totalPotions: result.potionsUsed,
    hpBeforeBossPct: round1(boss?.hpBeforePercent ?? 0),
    bossHpAfterPct: round1(boss?.hpAfterPercent ?? 0),
    bossPotions: boss?.potionsUsed ?? 0,
    bossSeconds: round1(boss?.seconds ?? 0),
    bossAbilityCasts: boss?.abilities.reduce((sum, ability) => sum + ability.casts, 0) ?? 0,
    bossDps: round1(boss?.observedDps ?? 0),
  };
}

describe("Tower potion monotonicity benchmark", () => {
  it("reports difficulty inversions from Difficulty 0 through +20%", () => {
    const rows = TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.flatMap((faction) => (
      ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => {
        const points = DIFFICULTY_STEPS.flatMap((multiplier) => {
          const row = runOne(tier, faction, weapon, multiplier);
          return row === undefined ? [] : [row];
        });
        return points;
      })
    )));

    const matchupKeys = [...new Set(rows.map((row) => `${row.weapon}|${String(row.tier)}|${row.faction}`))];
    const inversions = matchupKeys.flatMap((key) => {
      const series = rows
        .filter((row) => `${row.weapon}|${String(row.tier)}|${row.faction}` === key)
        .sort((a, b) => a.multiplier - b.multiplier);
      return series.slice(1).flatMap((current, index) => {
        const previous = series[index]!;
        if (!previous.clear || !current.clear) return [];
        const hpDelta = round1(current.hpPct - previous.hpPct);
        if (hpDelta <= 0) return [];
        return [{
          tier: current.tier,
          faction: current.faction,
          weapon: current.weapon,
          fromMultiplier: previous.multiplier,
          toMultiplier: current.multiplier,
          hpBeforePct: previous.hpPct,
          hpAfterPct: current.hpPct,
          hpGainPct: hpDelta,
          potionsBefore: previous.totalPotions,
          potionsAfter: current.totalPotions,
          potionDelta: current.totalPotions - previous.totalPotions,
          bossPotionsBefore: previous.bossPotions,
          bossPotionsAfter: current.bossPotions,
          bossPotionDelta: current.bossPotions - previous.bossPotions,
          bossCastsBefore: previous.bossAbilityCasts,
          bossCastsAfter: current.bossAbilityCasts,
          bossCastDelta: current.bossAbilityCasts - previous.bossAbilityCasts,
          bossSecondsBefore: previous.bossSeconds,
          bossSecondsAfter: current.bossSeconds,
          bossDpsBefore: previous.bossDps,
          bossDpsAfter: current.bossDps,
        }];
      });
    });

    const significant = inversions.filter((row) => row.hpGainPct >= SIGNIFICANT_HP_INVERSION_PCT);
    const potionLinked = significant.filter((row) => row.potionDelta > 0 || row.bossPotionDelta > 0);
    const summary = matchupKeys.map((key) => {
      const series = rows
        .filter((row) => `${row.weapon}|${String(row.tier)}|${row.faction}` === key)
        .sort((a, b) => a.multiplier - b.multiplier);
      const local = significant.filter((row) => (
        row.weapon === series[0]!.weapon && row.tier === series[0]!.tier && row.faction === series[0]!.faction
      ));
      const firstFailure = series.find((row) => !row.clear);
      const largest = local.reduce<typeof local[number] | undefined>(
        (best, row) => best === undefined || row.hpGainPct > best.hpGainPct ? row : best,
        undefined,
      );
      return {
        tier: series[0]!.tier,
        faction: series[0]!.faction,
        weapon: series[0]!.weapon,
        significantInversions: local.length,
        potionLinkedInversions: local.filter((row) => row.potionDelta > 0 || row.bossPotionDelta > 0).length,
        largestHpGainPct: largest?.hpGainPct ?? 0,
        largestAtMultiplier: largest?.toMultiplier ?? null,
        firstFailureMultiplier: firstFailure?.multiplier ?? null,
      };
    });

    console.log("[TOWER_POTION_MONOTONICITY_REFERENCE]", {
      difficultyRange: "x1.00..x1.20",
      step: 0.01,
      significantHpInversionPct: SIGNIFICANT_HP_INVERSION_PCT,
      potionRules: "live runtime, uncapped inventory stock",
      baseline: ".4 weapon, .3 equipment, strain 10 + 15 Item Power, favorable faction matchup",
    });
    console.log("[TOWER_POTION_MONOTONICITY_SUMMARY]");
    console.table(summary.filter((row) => row.significantInversions > 0).sort((a, b) => b.largestHpGainPct - a.largestHpGainPct));
    console.log("[TOWER_POTION_MONOTONICITY_INVERSIONS]");
    console.table(significant.sort((a, b) => b.hpGainPct - a.hpGainPct));
    console.log("[TOWER_POTION_MONOTONICITY_POTION_LINKED]");
    console.table(potionLinked.sort((a, b) => b.hpGainPct - a.hpGainPct));

    expect(rows).toHaveLength(2100);
    expect(matchupKeys).toHaveLength(100);
  });
});
