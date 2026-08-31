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
const BASELINE_ENCHANTMENT = 3 as const;
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
  if (traitId === "cooldown_reduction") return AUTHORED_AWAKENED_WEAPON_BALANCE.traitCaps.cooldown_reduction;
  if (traitId === "life_steal") return AUTHORED_AWAKENED_WEAPON_BALANCE.traitCaps.life_steal;
  return undefined;
}

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

function runTowerCase(
  weaponItemId: string,
  label: string,
  heroDamageMultiplier: number,
  incomingDamageReductionPercent: number,
  enchantment: 3 | 4,
  awakenedWeapon?: { readonly strain: number; readonly traits: readonly { readonly traitId: AwakenedTraitId; readonly value: number }[] },
): CombatRuntimeBenchmarkResult {
  return runCombatRuntimeBenchmark({
    label,
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, TIER, FACTION),
    zoneDefId: ZONE_DEF_ID,
    segmentIndex: SEGMENT_INDEX,
    enchantment,
    equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
    ...(awakenedWeapon === undefined ? {} : { awakenedWeapon }),
    familyMasteryLevel: mastery.familyMasteryLevel,
    specializationMasteryLevel: mastery.specializationMasteryLevel,
    siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
    useHealthPotions: true,
    healthPotionQuantity: POTION_CAP,
    heroDamageMultiplier,
    incomingDamageReductionPercent,
    authoredEncounters,
  });
}

function resultScore(result: CombatRuntimeBenchmarkResult): number {
  if (result.clear) return 1_000_000 + result.hpPercent * 100 - result.seconds;
  return result.encounterReached * 10_000 + result.encounterProgressPercent * 100 + result.hpPercent;
}

console.log("[TOWER_21_25_REFERENCE]", {
  floors: `${String(FLOOR_START)}-${String(FLOOR_END)}`,
  tier: TIER,
  faction: FACTION,
  baselineWeaponEnchantment: BASELINE_ENCHANTMENT,
  awakenedWeaponEnchantment: WEAPON_ENCHANTMENT,
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

console.log("[TOWER_21_25_AWAKENED_TRAIT_VALUES]");
console.table(COMBAT_TRAITS.map((traitId) => ({
  trait: traitId,
  valueAtStrain10: getOptimizedTraitValueAtStrain(traitId, STRAIN),
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

const validationRows = counterWeapons.map(({ weapon, weaponItemId, modifiers }) => {
  const heroDamageMultiplier = (
    1 + modifiers.outgoingDamageBonusPercent / 100
  ) * modifiers.factionResilienceDamageMultiplier;
  const t53 = runTowerCase(
    weaponItemId,
    `tower_21_25_t5_3_${weapon.family}_${weapon.label}`,
    heroDamageMultiplier,
    modifiers.incomingDamageReductionPercent,
    BASELINE_ENCHANTMENT,
  );
  // A plain .4 is not an awakened weapon yet. Keep this validation on the exact
  // same runtime/mastery path as .3; only the strain sweep below injects
  // AwakenedWeaponService state.
  const t54NoTrait = runTowerCase(
    weaponItemId,
    `tower_21_25_t5_4_no_trait_${weapon.family}_${weapon.label}`,
    heroDamageMultiplier,
    modifiers.incomingDamageReductionPercent,
    WEAPON_ENCHANTMENT,
  );

  if (resultScore(t54NoTrait) < resultScore(t53)) {
    throw new Error(
      `[TOWER_BENCHMARK_INVALID] ${weapon.label}: T5.4 no-trait regressed below T5.3 `
      + `(T5.3 clear=${String(t53.clear)} reached=${String(t53.encounterReached)} progress=${String(t53.encounterProgressPercent)} dps=${String(t53.observedDps)}; `
      + `T5.4 clear=${String(t54NoTrait.clear)} reached=${String(t54NoTrait.encounterReached)} progress=${String(t54NoTrait.encounterProgressPercent)} dps=${String(t54NoTrait.observedDps)})`,
    );
  }

  return { weapon, weaponItemId, modifiers, heroDamageMultiplier, t53, t54NoTrait };
});

console.log("[TOWER_21_25_ENCHANTMENT_VALIDATION]");
console.table(validationRows.map(({ weapon, t53, t54NoTrait }) => ({
  weapon: weapon.label,
  t53Clear: t53.clear,
  t53ProgressPct: t53.encounterProgressPercent,
  t53Dps: t53.observedDps,
  t54NoTraitClear: t54NoTrait.clear,
  t54NoTraitProgressPct: t54NoTrait.encounterProgressPercent,
  t54NoTraitDps: t54NoTrait.observedDps,
})));

const traitRuns = validationRows.flatMap(({ weapon, weaponItemId, modifiers, heroDamageMultiplier }) => (
  COMBAT_TRAITS.map((traitId) => {
    const traitValue = getOptimizedTraitValueAtStrain(traitId, STRAIN);
    const result = runTowerCase(
      weaponItemId,
      `tower_21_25_t5_4_s10_${weapon.family}_${weapon.label}_${traitId}`,
      heroDamageMultiplier,
      modifiers.incomingDamageReductionPercent,
      WEAPON_ENCHANTMENT,
      { strain: STRAIN, traits: [{ traitId, value: traitValue }] },
    );
    return { weapon, traitId, traitValue, result };
  })
));

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
