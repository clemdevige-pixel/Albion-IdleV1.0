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
const TOWER_SWEEP_TARGET_MIN_HP_PERCENT = 8;
const TOWER_SWEEP_TARGET_MAX_HP_PERCENT = 10;
const TOWER_SWEEP_MIN_MULTIPLIER = 0.2;
const TOWER_COARSE_SWEEP_STEP = 0.01;
const TOWER_FINE_SWEEP_STEP = 0.001;

const round1 = (value: number): number => Number(value.toFixed(1));
const round3 = (value: number): number => Number(value.toFixed(3));

function resolveDifficultyZeroBlock(tier: TowerTier, factionId: TowerFactionId) {
  return Array.from({ length: 5 }, (_, indexInBlock) => {
    const encounter = resolveTowerDifficultyZeroEncounter(tier, factionId, indexInBlock);
    return {
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: encounter.combatProfile,
    };
  });
}

function scaleDifficultyZeroBlock(
  encounters: ReturnType<typeof resolveDifficultyZeroBlock>,
  multiplier: number,
) {
  return encounters.map((encounter) => ({
    monsterDefinitionId: encounter.monsterDefinitionId,
    profile: {
      hp: Math.max(1, Math.round(encounter.profile.hp * multiplier)),
      damage: Math.max(1, Math.round(encounter.profile.damage * multiplier)),
      attackSpeed: encounter.profile.attackSpeed,
      armor: Math.max(0, Math.round(encounter.profile.armor * multiplier)),
      magicResistance: Math.max(0, Math.round(encounter.profile.magicResistance * multiplier)),
    },
  }));
}

function runFavorableWeaponsAtMultiplier(
  tier: TowerTier,
  factionId: TowerFactionId,
  multiplier: number,
) {
  const dungeon = DUNGEON_DEFINITIONS.find((definition) => (
    definition.tier === tier && definition.faction.toLowerCase() === factionId
  ));
  if (dungeon === undefined) throw new Error(`Missing Dungeon source for ${factionId} T${String(tier)}`);

  const authoredEncounters = scaleDifficultyZeroBlock(resolveDifficultyZeroBlock(tier, factionId), multiplier);
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
      label: `tower_difficulty_zero_t${String(tier)}_${factionId}_${weapon.family}_${weapon.label}_x${multiplier.toFixed(3)}`,
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
    }];
  });
}

function isViableSweepResult(rows: ReturnType<typeof runFavorableWeaponsAtMultiplier>): boolean {
  return rows.length === 5
    && rows.every((row) => row.clear)
    && Math.min(...rows.map((row) => row.hpPct)) >= TOWER_SWEEP_TARGET_MIN_HP_PERCENT;
}

function findFineSweepResult(tier: TowerTier, faction: TowerFactionId) {
  let coarseMultiplier: number | undefined;
  const totalCoarseSteps = Math.round((1 - TOWER_SWEEP_MIN_MULTIPLIER) / TOWER_COARSE_SWEEP_STEP);
  for (let step = 0; step <= totalCoarseSteps; step += 1) {
    const multiplier = round3(1 - step * TOWER_COARSE_SWEEP_STEP);
    if (isViableSweepResult(runFavorableWeaponsAtMultiplier(tier, faction, multiplier))) {
      coarseMultiplier = multiplier;
      break;
    }
  }
  if (coarseMultiplier === undefined) {
    throw new Error(`No viable coarse difficulty-zero multiplier found for T${String(tier)} ${faction}`);
  }

  const fineStart = Math.min(1, round3(coarseMultiplier + TOWER_COARSE_SWEEP_STEP - TOWER_FINE_SWEEP_STEP));
  for (
    let multiplier = fineStart;
    multiplier >= coarseMultiplier - 0.0005;
    multiplier = round3(multiplier - TOWER_FINE_SWEEP_STEP)
  ) {
    const rows = runFavorableWeaponsAtMultiplier(tier, faction, multiplier);
    if (isViableSweepResult(rows)) return { multiplier, rows };
  }

  throw new Error(`No viable fine difficulty-zero multiplier found for T${String(tier)} ${faction}`);
}

describe("Tower difficulty-zero base curve benchmark", () => {
  it("fine-sweeps the minimum common nerf needed for the weakest favorable weapon to clear at 8-10% HP", () => {
    const sweepRows = TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.map((faction) => {
      const selected = findFineSweepResult(tier, faction);
      const sortedByHp = [...selected.rows].sort((a, b) => a.hpPct - b.hpPct);
      const weakest = sortedByHp[0]!;
      const strongest = sortedByHp[sortedByHp.length - 1]!;
      return {
        tier,
        faction,
        multiplier: selected.multiplier,
        nerfPct: round1((1 - selected.multiplier) * 100),
        weakestWeapon: weakest.weapon,
        weakestHpPct: weakest.hpPct,
        weakestInTargetBand: weakest.hpPct >= TOWER_SWEEP_TARGET_MIN_HP_PERCENT
          && weakest.hpPct <= TOWER_SWEEP_TARGET_MAX_HP_PERCENT,
        strongestWeapon: strongest.weapon,
        strongestHpPct: strongest.hpPct,
        hpSpread: round1(strongest.hpPct - weakest.hpPct),
        maxPotionsUsed: Math.max(...selected.rows.map((row) => row.potions)),
      };
    }));

    const anomalyRows = sweepRows.filter((row) => (
      row.strongestHpPct >= 30 || row.hpSpread >= 20 || !row.weakestInTargetBand
    ));

    console.log("[TOWER_DIFFICULTY_ZERO_FINE_SWEEP_REFERENCE]", {
      targetWeakestHpBand: `${String(TOWER_SWEEP_TARGET_MIN_HP_PERCENT)}-${String(TOWER_SWEEP_TARGET_MAX_HP_PERCENT)}%`,
      selectionRule: "highest common multiplier where all 5 favorable weapons clear and weakest has >=8% HP",
      coarseStep: TOWER_COARSE_SWEEP_STEP,
      fineStep: TOWER_FINE_SWEEP_STEP,
      minimumMultiplier: TOWER_SWEEP_MIN_MULTIPLIER,
      scaling: "HP + damage + armor + magicResistance; attackSpeed unchanged",
      weaponEnchantment: TOWER_WEAPON_ENCHANTMENT,
      equipmentEnchantment: TOWER_EQUIPMENT_ENCHANTMENT,
      awakenedStrain: TOWER_EARLY_AWAKENING_STRAIN,
      awakenedTraits: [{ traitId: "item_power", value: TOWER_EARLY_AWAKENING_ITEM_POWER }],
    });
    console.log("[TOWER_DIFFICULTY_ZERO_FINE_SWEEP_SUMMARY]");
    console.table(sweepRows);
    console.log("[TOWER_DIFFICULTY_ZERO_FINE_SWEEP_ANOMALIES]");
    console.table(anomalyRows);

    expect(sweepRows).toHaveLength(20);
    expect(sweepRows.every((row) => row.weakestHpPct >= TOWER_SWEEP_TARGET_MIN_HP_PERCENT)).toBe(true);
  });
});
