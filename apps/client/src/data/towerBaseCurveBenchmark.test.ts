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
const TOWER_ENCOUNTER_ROLES = ["normal_1", "normal_2", "reinforced", "elite", "boss"] as const;

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

function runFavorableWeapons(tier: TowerTier, factionId: TowerFactionId) {
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
      label: `tower_live_zero_t${String(tier)}_${factionId}_${weapon.family}_${weapon.label}`,
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

    return [{
      tier,
      faction: factionId,
      family: weapon.family,
      weapon: weapon.label,
      bonusPct,
      clear: result.clear,
      hpPct: round1(result.hpPercent),
      seconds: round1(result.seconds),
      potions: result.potionsUsed,
      enemyHpRemainingPct: round1(result.enemyHpRemainingPercent),
      encounters: result.encounters,
    }];
  });
}

describe("Tower live Difficulty 0 benchmark", () => {
  it("keeps every favorable weapon clearable across every tier and faction", () => {
    const rows = TOWER_TIERS.flatMap((tier) => (
      TOWER_FACTIONS.flatMap((faction) => runFavorableWeapons(tier, faction))
    ));

    const summary = TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.map((faction) => {
      const group = rows.filter((row) => row.tier === tier && row.faction === faction);
      const sorted = [...group].sort((a, b) => a.hpPct - b.hpPct);
      const weakest = sorted[0]!;
      const strongest = sorted[sorted.length - 1]!;
      return {
        tier,
        faction,
        clears: `${String(group.filter((row) => row.clear).length)}/${String(group.length)}`,
        weakestWeapon: weakest.weapon,
        weakestHpPct: weakest.hpPct,
        strongestWeapon: strongest.weapon,
        strongestHpPct: strongest.hpPct,
        hpSpread: round1(strongest.hpPct - weakest.hpPct),
        maxPotionsUsed: Math.max(...group.map((row) => row.potions)),
      };
    }));

    const weaponNames = [...new Set(rows.map((row) => row.weapon))].sort((a, b) => a.localeCompare(b));
    const weaponSummary = weaponNames.map((weapon) => {
      const group = rows
        .filter((row) => row.weapon === weapon)
        .sort((a, b) => a.tier - b.tier);
      const min = group.reduce((current, row) => row.hpPct < current.hpPct ? row : current);
      const max = group.reduce((current, row) => row.hpPct > current.hpPct ? row : current);
      return {
        weapon,
        family: group[0]!.family,
        positiveFaction: group[0]!.faction,
        tiers: group.length,
        clears: `${String(group.filter((row) => row.clear).length)}/${String(group.length)}`,
        avgHpPct: round1(group.reduce((sum, row) => sum + row.hpPct, 0) / group.length),
        minHpPct: min.hpPct,
        minHpTier: min.tier,
        maxHpPct: max.hpPct,
        maxHpTier: max.tier,
        hpRange: round1(max.hpPct - min.hpPct),
        avgSeconds: round1(group.reduce((sum, row) => sum + row.seconds, 0) / group.length),
        maxPotionsUsed: Math.max(...group.map((row) => row.potions)),
      };
    });

    const encounterRows = rows.flatMap((row) => row.encounters.map((encounter, index) => ({
      tier: row.tier,
      faction: row.faction,
      family: row.family,
      weapon: row.weapon,
      role: TOWER_ENCOUNTER_ROLES[index] ?? `encounter_${String(index + 1)}`,
      seconds: round1(encounter.seconds),
      hpBeforePct: round1(encounter.hpBeforePercent),
      hpAfterPct: round1(encounter.hpAfterPercent),
      potions: encounter.potionsUsed,
      damageDealt: round1(encounter.damageDealt),
      damageReceived: round1(encounter.damageReceived),
      observedDps: round1(encounter.observedDps),
      incomingDps: round1(encounter.incomingDps),
      autoAttackDamage: round1(encounter.damageBySource.autoAttack),
      abilityDamage: round1(encounter.damageBySource.ability),
      effectDamage: round1(encounter.damageBySource.effect),
      abilityCasts: encounter.abilities.reduce((sum, ability) => sum + ability.casts, 0),
    })));

    const weaponTierDps = rows.map((row) => {
      const normalEncounters = row.encounters.slice(0, 2);
      const boss = row.encounters[4];
      const normalSeconds = normalEncounters.reduce((sum, encounter) => sum + encounter.seconds, 0);
      const normalDamage = normalEncounters.reduce((sum, encounter) => sum + encounter.damageDealt, 0);
      return {
        tier: row.tier,
        faction: row.faction,
        family: row.family,
        weapon: row.weapon,
        normalDps: round1(normalSeconds <= 0 ? 0 : normalDamage / normalSeconds),
        bossDps: round1(boss === undefined || boss.seconds <= 0 ? 0 : boss.damageDealt / boss.seconds),
        normalSeconds: round1(normalSeconds),
        bossSeconds: round1(boss?.seconds ?? 0),
        hpBeforeBossPct: round1(boss?.hpBeforePercent ?? 0),
        hpAfterBossPct: round1(boss?.hpAfterPercent ?? 0),
        potionsBeforeBoss: row.encounters.slice(0, 4).reduce((sum, encounter) => sum + encounter.potionsUsed, 0),
        bossPotions: boss?.potionsUsed ?? 0,
        bossAbilityCasts: boss?.abilities.reduce((sum, ability) => sum + ability.casts, 0) ?? 0,
      };
    });

    const weaponDpsSummary = weaponNames.map((weapon) => {
      const group = weaponTierDps.filter((row) => row.weapon === weapon);
      return {
        weapon,
        family: group[0]!.family,
        positiveFaction: group[0]!.faction,
        avgNormalDps: round1(group.reduce((sum, row) => sum + row.normalDps, 0) / group.length),
        avgBossDps: round1(group.reduce((sum, row) => sum + row.bossDps, 0) / group.length),
        minBossDps: round1(Math.min(...group.map((row) => row.bossDps))),
        maxBossDps: round1(Math.max(...group.map((row) => row.bossDps))),
        bossDpsRange: round1(Math.max(...group.map((row) => row.bossDps)) - Math.min(...group.map((row) => row.bossDps))),
      };
    });

    const anomalyRows = summary.filter((row) => (
      row.strongestHpPct >= 30 || row.hpSpread >= 20
    ));

    console.log("[TOWER_LIVE_DIFFICULTY_ZERO_REFERENCE]", {
      encounterSource: "resolveTowerDifficultyZeroEncounter",
      weaponEnchantment: TOWER_WEAPON_ENCHANTMENT,
      equipmentEnchantment: TOWER_EQUIPMENT_ENCHANTMENT,
      awakenedStrain: TOWER_EARLY_AWAKENING_STRAIN,
      awakenedTraits: [{ traitId: "item_power", value: TOWER_EARLY_AWAKENING_ITEM_POWER }],
      favorableMatchupsOnly: true,
      baselineRule: "calibrated Difficulty 0, before Endless depth scaling",
      dpsRule: "observed damage / encounter combat seconds; normal DPS aggregates normal_1 + normal_2 only",
    });
    console.log("[TOWER_LIVE_DIFFICULTY_ZERO_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_LIVE_WEAPON_TIER_MATRIX]");
    console.table([...rows].map(({ encounters: _encounters, ...row }) => row).sort((a, b) => (
      a.weapon.localeCompare(b.weapon) || a.tier - b.tier
    )));
    console.log("[TOWER_LIVE_WEAPON_SUMMARY]");
    console.table([...weaponSummary].sort((a, b) => b.avgHpPct - a.avgHpPct));
    console.log("[TOWER_LIVE_ENCOUNTER_TELEMETRY]");
    console.table([...encounterRows].sort((a, b) => (
      a.weapon.localeCompare(b.weapon) || a.tier - b.tier || TOWER_ENCOUNTER_ROLES.indexOf(a.role as typeof TOWER_ENCOUNTER_ROLES[number]) - TOWER_ENCOUNTER_ROLES.indexOf(b.role as typeof TOWER_ENCOUNTER_ROLES[number])
    )));
    console.log("[TOWER_LIVE_WEAPON_TIER_DPS]");
    console.table([...weaponTierDps].sort((a, b) => (
      a.weapon.localeCompare(b.weapon) || a.tier - b.tier
    )));
    console.log("[TOWER_LIVE_WEAPON_DPS_SUMMARY]");
    console.table([...weaponDpsSummary].sort((a, b) => b.avgBossDps - a.avgBossDps));
    console.log("[TOWER_LIVE_DIFFICULTY_ZERO_ANOMALIES]");
    console.table(anomalyRows);

    expect(rows).toHaveLength(100);
    expect(summary).toHaveLength(20);
    expect(weaponSummary).toHaveLength(20);
    expect(weaponTierDps).toHaveLength(100);
    expect(weaponDpsSummary).toHaveLength(20);
    expect(encounterRows).toHaveLength(500);
    expect(weaponSummary.every((entry) => entry.tiers === 5)).toBe(true);
    expect(rows.every((row) => row.clear)).toBe(true);
  });
});
