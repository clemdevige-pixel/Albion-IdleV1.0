import { AUTHORED_AWAKENED_WEAPON_BALANCE } from "@game/data";
import type { AwakenedTraitId } from "@game/gameplay";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
} from "../apps/client/src/data/artifactWeaponBenchmarkFixtures.js";
import { resolveFactionCombatModifiers } from "../apps/client/src/data/factionCombatResolver.js";
import { resolveTowerEncounter } from "../apps/client/src/data/towerEncounterResolver.js";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type CombatRuntimeBenchmarkEncounter,
  type CombatRuntimeBenchmarkResult,
} from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const FLOOR_START = 21;
const FLOOR_END = 25;
const TIER = 5 as const;
const FACTION = "morgana" as const;
const WEAPON_ENCHANTMENT = 4 as const;
const EQUIPMENT_ENCHANTMENT = 3 as const;
const STRAIN = 10;
const POTION_CAP = 2;
const TOWER_SEED = "tower-benchmark-21-25";
const ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
const SEGMENT_INDEX = 9;
const CAPE_ITEM_ID = `item_cape_t${TIER}_${FACTION}`;

const COMBAT_TRAITS = [
  "item_power",
  "auto_attack_damage",
  "ability_power",
  "cooldown_reduction",
  "max_health",
  "defense",
  "life_steal",
] as const satisfies readonly AwakenedTraitId[];

const floors = Array.from(
  { length: FLOOR_END - FLOOR_START + 1 },
  (_, index) => FLOOR_START + index,
);
const resolvedFloors = floors.map((floor) => resolveTowerEncounter(floor, TOWER_SEED));

for (const encounter of resolvedFloors) {
  if (
    encounter.floorDefinition.block.tier !== TIER
    || encounter.floorDefinition.block.factionId !== FACTION
  ) {
    throw new Error(
      `Tower benchmark expected T${String(TIER)} ${FACTION} on floor ${String(encounter.floorDefinition.floor)}`,
    );
  }
}

const authoredEncounters: readonly CombatRuntimeBenchmarkEncounter[] = resolvedFloors.map((encounter) => ({
  monsterDefinitionId: encounter.monsterDefinitionId,
  profile: encounter.combatProfile,
}));
const mastery = artifactBenchmarkMasteryProfile(TIER);

function getTraitRollMax(traitId: AwakenedTraitId, currentValue: number): number {
  if (traitId === "cooldown_reduction" || traitId === "life_steal") {
    const bands = AUTHORED_AWAKENED_WEAPON_BALANCE.progressiveTraitRolls[traitId];
    const selected = bands.find((band) => band.below === null || currentValue < band.below);
    if (selected === undefined) throw new Error(`Missing progressive roll band for ${traitId}`);
    return selected.max;
  }
  return AUTHORED_AWAKENED_WEAPON_BALANCE.traitRolls[traitId].max;
}

function getTraitCap(traitId: AwakenedTraitId): number | undefined {
  if (traitId === "cooldown_reduction") {
    return AUTHORED_AWAKENED_WEAPON_BALANCE.traitCaps.cooldown_reduction;
  }
  if (traitId === "life_steal") {
    return AUTHORED_AWAKENED_WEAPON_BALANCE.traitCaps.life_steal;
  }
  return undefined;
}

/**
 * Exact strain-10 upper deterministic roll without relying on critical RNG:
 * one fill action + nine improvements on the same trait.
 */
function getOptimizedTraitValueAtStrain(traitId: AwakenedTraitId, strain: number): number {
  let value = 0;
  for (let modification = 0; modification < strain; modification += 1) {
    value += getTraitRollMax(traitId, value);
    const cap = getTraitCap(traitId);
    if (cap !== undefined) value = Math.min(cap, value);
  }
  return Number(value.toFixed(4));
}

function compareResults(a: CombatRuntimeBenchmarkResult, b: CombatRuntimeBenchmarkResult): number {
  if (a.clear !== b.clear) return a.clear ? -1 : 1;
  if (a.clear && b.clear) {
    if (a.hpPercent !== b.hpPercent) return b.hpPercent - a.hpPercent;
    return a.seconds - b.seconds;
  }
  if (a.encounterReached !== b.encounterReached) return b.encounterReached - a.encounterReached;
  if (a.encounterProgressPercent !== b.encounterProgressPercent) {
    return b.encounterProgressPercent - a.encounterProgressPercent;
  }
  if (a.hpPercent !== b.hpPercent) return b.hpPercent - a.hpPercent;
  return a.seconds - b.seconds;
}

console.log("[TOWER_21_25_AWAKENED_REFERENCE]", {
  floors: `${String(FLOOR_START)}-${String(FLOOR_END)}`,
  tier: TIER,
  faction: FACTION,
  weaponEnchantment: WEAPON_ENCHANTMENT,
  equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
  strain: STRAIN,
  traitPolicy: "single trait, max legal non-critical value after 10 modifications",
  familyMastery: mastery.familyMasteryLevel,
  specializationMastery: mastery.specializationMasteryLevel,
  siblingMastery: mastery.siblingSpecializationMasteryLevel,
  matchingCape: CAPE_ITEM_ID,
  potionCap: POTION_CAP,
  seed: TOWER_SEED,
});

console.log("[TOWER_21_25_AWAKENED_TRAIT_VALUES]");
console.table(COMBAT_TRAITS.map((traitId) => ({
  trait: traitId,
  valueAtStrain10: getOptimizedTraitValueAtStrain(traitId, STRAIN),
})));

console.log("[TOWER_21_25_ENCOUNTERS]");
console.table(resolvedFloors.map((encounter) => ({
  floor: encounter.floorDefinition.floor,
  role: encounter.floorDefinition.role,
  monster: encounter.monsterDefinitionId,
  hp: encounter.combatProfile.hp,
  damage: encounter.combatProfile.damage,
  armor: encounter.combatProfile.armor,
  magicResistance: encounter.combatProfile.magicResistance,
})));

const counterWeapons = ARTIFACT_WEAPON_BENCHMARK_SPECS
  .map((weapon) => {
    const weaponItemId = weapon.itemId(TIER);
    const modifiers = resolveFactionCombatModifiers(
      { weaponItemId, capeItemId: CAPE_ITEM_ID },
      { factionId: FACTION, tier: TIER, activity: "tower" },
    );
    return { weapon, weaponItemId, modifiers };
  })
  .filter(({ modifiers }) => modifiers.outgoingDamageBonusPercent > 0);

const traitRuns = counterWeapons.flatMap(({ weapon, weaponItemId, modifiers }) => {
  const heroDamageMultiplier = (
    1 + modifiers.outgoingDamageBonusPercent / 100
  ) * modifiers.factionResilienceDamageMultiplier;

  return COMBAT_TRAITS.map((traitId) => {
    const traitValue = getOptimizedTraitValueAtStrain(traitId, STRAIN);
    const result = runCombatRuntimeBenchmark({
      label: `tower_21_25_t5_4_s10_${weapon.family}_${weapon.label}_${traitId}`,
      weaponItemId,
      equipmentItemIds: artifactDungeonEquipment(weaponItemId, TIER, FACTION),
      zoneDefId: ZONE_DEF_ID,
      segmentIndex: SEGMENT_INDEX,
      enchantment: WEAPON_ENCHANTMENT,
      equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
      awakenedWeapon: {
        strain: STRAIN,
        traits: [{ traitId, value: traitValue }],
      },
      familyMasteryLevel: mastery.familyMasteryLevel,
      specializationMasteryLevel: mastery.specializationMasteryLevel,
      siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
      useHealthPotions: true,
      healthPotionQuantity: POTION_CAP,
      heroDamageMultiplier,
      incomingDamageReductionPercent: modifiers.incomingDamageReductionPercent,
      authoredEncounters,
    });

    return {
      weapon,
      weaponItemId,
      modifiers,
      heroDamageMultiplier,
      traitId,
      traitValue,
      result,
    };
  });
});

console.log("[TOWER_21_25_AWAKENED_TRAIT_SWEEP]");
console.table(traitRuns.map(({ weapon, traitId, traitValue, result }) => ({
  weapon: weapon.label,
  trait: traitId,
  traitValue,
  clear: result.clear,
  floorReached: FLOOR_START + result.encounterReached - 1,
  progressPct: result.encounterProgressPercent,
  hpPct: result.hpPercent,
  potions: result.potionsUsed,
  seconds: result.seconds,
  dps: result.observedDps,
})));

const bestRuns = counterWeapons.map(({ weapon }) => {
  const candidates = traitRuns
    .filter((run) => run.weapon.label === weapon.label)
    .sort((a, b) => compareResults(a.result, b.result));
  const best = candidates[0];
  if (best === undefined) throw new Error(`No awakened Tower benchmark run for ${weapon.label}`);
  return best;
});

console.log("[TOWER_21_25_AWAKENED_BEST_MATRIX]");
console.table(bestRuns.map(({ weapon, traitId, traitValue, result }) => ({
  family: weapon.family,
  weapon: weapon.label,
  bestTrait: traitId,
  traitValue,
  clear: result.clear,
  failedFloor: result.clear ? null : FLOOR_START + result.encounterReached - 1,
  hpPct: result.hpPercent,
  potions: result.potionsUsed,
  seconds: result.seconds,
  floor25ProgressPct: result.bossProgressPercent,
  dps: result.observedDps,
  incomingDps: result.incomingDps,
})));

const clears = bestRuns.filter(({ result }) => result.clear);
const failures = bestRuns.filter(({ result }) => !result.clear);
console.log("[TOWER_21_25_AWAKENED_SUMMARY]", {
  testedWeapons: bestRuns.length,
  strain: STRAIN,
  weaponEnchantment: WEAPON_ENCHANTMENT,
  equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
  clearCount: clears.length,
  failCount: failures.length,
  clears: clears.map(({ weapon, traitId, traitValue, result }) => ({
    weapon: weapon.label,
    trait: traitId,
    traitValue,
    hpPct: result.hpPercent,
  })),
  failures: failures.map(({ weapon, traitId, traitValue, result }) => ({
    weapon: weapon.label,
    trait: traitId,
    traitValue,
    failedFloor: FLOOR_START + result.encounterReached - 1,
    encounterProgressPct: result.encounterProgressPercent,
  })),
});
