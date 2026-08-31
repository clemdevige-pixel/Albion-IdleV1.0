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
const TARGET_MIN_HP = 8;
const TARGET_MAX_HP = 15;
const MIN_SCALE = 0.5;
const COARSE_STEP = 0.02;
const FINE_STEP = 0.005;
const FINE_RADIUS = 0.03;
const BADON_LABEL = "Bow of Badon";
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
const mastery = artifactBenchmarkMasteryProfile(TIER);

for (const encounter of resolvedFloors) {
  if (
    encounter.floorDefinition.block.tier !== TIER
    || encounter.floorDefinition.block.factionId !== FACTION
  ) {
    throw new Error(
      `Tower nerf sweep expected T${String(TIER)} ${FACTION} on floor ${String(encounter.floorDefinition.floor)}`,
    );
  }
}

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
  return a.seconds - b.seconds;
}

function scaleProfile(value: number, scale: number): number {
  return Math.max(1, Math.round(value * scale));
}

function buildScaledEncounters(
  damageScale: number,
  hpScale: number,
): readonly CombatRuntimeBenchmarkEncounter[] {
  return resolvedFloors.map((encounter) => ({
    monsterDefinitionId: encounter.monsterDefinitionId,
    profile: {
      hp: scaleProfile(encounter.combatProfile.hp, hpScale),
      damage: scaleProfile(encounter.combatProfile.damage, damageScale),
      attackSpeed: encounter.combatProfile.attackSpeed,
      armor: encounter.combatProfile.armor,
      magicResistance: encounter.combatProfile.magicResistance,
    },
  }));
}

function runTowerCase(
  weaponItemId: string,
  label: string,
  heroDamageMultiplier: number,
  incomingDamageReductionPercent: number,
  traitId: AwakenedTraitId,
  traitValue: number,
  authoredEncounters: readonly CombatRuntimeBenchmarkEncounter[],
): CombatRuntimeBenchmarkResult {
  return runCombatRuntimeBenchmark({
    label,
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
    incomingDamageReductionPercent,
    authoredEncounters,
  });
}

const counterWeapons = ARTIFACT_WEAPON_BENCHMARK_SPECS
  .map((weapon) => {
    const weaponItemId = weapon.itemId(TIER);
    const modifiers = resolveFactionCombatModifiers(
      { weaponItemId, capeItemId: CAPE_ITEM_ID },
      { factionId: FACTION, tier: TIER, activity: "tower" },
    );
    const heroDamageMultiplier = (
      1 + modifiers.outgoingDamageBonusPercent / 100
    ) * modifiers.factionResilienceDamageMultiplier;
    return { weapon, weaponItemId, modifiers, heroDamageMultiplier };
  })
  .filter(({ modifiers }) => modifiers.outgoingDamageBonusPercent > 0);

type BestRun = {
  readonly weapon: (typeof counterWeapons)[number]["weapon"];
  readonly traitId: AwakenedTraitId;
  readonly traitValue: number;
  readonly result: CombatRuntimeBenchmarkResult;
};

type SweepCandidate = {
  readonly damageScale: number;
  readonly hpScale: number;
  readonly damageNerfPct: number;
  readonly hpNerfPct: number;
  readonly totalNerfPct: number;
  readonly maxAxisNerfPct: number;
  readonly bestRuns: readonly BestRun[];
  readonly calibrationRuns: readonly BestRun[];
  readonly badonRun: BestRun | undefined;
  readonly allCalibrationClear: boolean;
  readonly allCalibrationInTarget: boolean;
  readonly targetMiss: number;
  readonly hpSpread: number;
};

function hpTargetDistance(hp: number, clear: boolean): number {
  if (!clear) return TARGET_MIN_HP + 100;
  if (hp < TARGET_MIN_HP) return TARGET_MIN_HP - hp;
  if (hp > TARGET_MAX_HP) return hp - TARGET_MAX_HP;
  return 0;
}

function evaluateScales(damageScale: number, hpScale: number): SweepCandidate {
  const encounters = buildScaledEncounters(damageScale, hpScale);
  const bestRuns = counterWeapons.map(({ weapon, weaponItemId, modifiers, heroDamageMultiplier }) => {
    const candidates = COMBAT_TRAITS.map((traitId) => {
      const traitValue = getOptimizedTraitValueAtStrain(traitId, STRAIN);
      const result = runTowerCase(
        weaponItemId,
        `tower_21_25_t5_4_s10_damage${damageScale.toFixed(3)}_hp${hpScale.toFixed(3)}_${weapon.family}_${traitId}`,
        heroDamageMultiplier,
        modifiers.incomingDamageReductionPercent,
        traitId,
        traitValue,
        encounters,
      );
      return { weapon, traitId, traitValue, result } satisfies BestRun;
    }).sort((a, b) => compareResults(a.result, b.result));
    const best = candidates[0];
    if (best === undefined) throw new Error(`No sweep result for ${weapon.label}`);
    return best;
  });

  const calibrationRuns = bestRuns.filter(({ weapon }) => weapon.label !== BADON_LABEL);
  const badonRun = bestRuns.find(({ weapon }) => weapon.label === BADON_LABEL);
  const allCalibrationClear = calibrationRuns.every(({ result }) => result.clear);
  const allCalibrationInTarget = calibrationRuns.every(({ result }) => (
    result.clear && result.hpPercent >= TARGET_MIN_HP && result.hpPercent <= TARGET_MAX_HP
  ));
  const targetMiss = calibrationRuns.reduce(
    (total, { result }) => total + hpTargetDistance(result.hpPercent, result.clear),
    0,
  );
  const hpValues = calibrationRuns
    .filter(({ result }) => result.clear)
    .map(({ result }) => result.hpPercent);
  const hpSpread = hpValues.length === 0 ? 100 : Math.max(...hpValues) - Math.min(...hpValues);
  const damageNerfPct = (1 - damageScale) * 100;
  const hpNerfPct = (1 - hpScale) * 100;

  return {
    damageScale,
    hpScale,
    damageNerfPct: Number(damageNerfPct.toFixed(1)),
    hpNerfPct: Number(hpNerfPct.toFixed(1)),
    totalNerfPct: Number((damageNerfPct + hpNerfPct).toFixed(1)),
    maxAxisNerfPct: Number(Math.max(damageNerfPct, hpNerfPct).toFixed(1)),
    bestRuns,
    calibrationRuns,
    badonRun,
    allCalibrationClear,
    allCalibrationInTarget,
    targetMiss: Number(targetMiss.toFixed(1)),
    hpSpread: Number(hpSpread.toFixed(1)),
  };
}

function candidateOrder(a: SweepCandidate, b: SweepCandidate): number {
  if (a.allCalibrationInTarget !== b.allCalibrationInTarget) {
    return a.allCalibrationInTarget ? -1 : 1;
  }
  if (a.allCalibrationClear !== b.allCalibrationClear) return a.allCalibrationClear ? -1 : 1;
  if (a.totalNerfPct !== b.totalNerfPct) return a.totalNerfPct - b.totalNerfPct;
  if (a.maxAxisNerfPct !== b.maxAxisNerfPct) return a.maxAxisNerfPct - b.maxAxisNerfPct;
  if (a.targetMiss !== b.targetMiss) return a.targetMiss - b.targetMiss;
  return a.hpSpread - b.hpSpread;
}

function makeScaleRange(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = max; value >= min - 0.000001; value -= step) {
    values.push(Number(value.toFixed(3)));
  }
  return values;
}

console.log("[TOWER_T5_DAMAGE_HP_SWEEP_REFERENCE]", {
  floors: `${String(FLOOR_START)}-${String(FLOOR_END)}`,
  tier: TIER,
  faction: FACTION,
  weaponEnchantment: WEAPON_ENCHANTMENT,
  equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
  strain: STRAIN,
  targetHpPct: `${String(TARGET_MIN_HP)}-${String(TARGET_MAX_HP)}`,
  calibrationWeapons: counterWeapons
    .filter(({ weapon }) => weapon.label !== BADON_LABEL)
    .map(({ weapon }) => weapon.label),
  excludedFromTarget: BADON_LABEL,
  damageAxis: "enemy damage",
  hpAxis: "enemy hp",
  unchangedStats: "enemy armor + magicResistance + attackSpeed",
  coarseScaleRange: `${MIN_SCALE.toFixed(2)}-1.00`,
  coarseStep: COARSE_STEP,
  fineStep: FINE_STEP,
});

const coarseCandidates: SweepCandidate[] = [];
const coarseScales = makeScaleRange(MIN_SCALE, 1, COARSE_STEP);
for (const damageScale of coarseScales) {
  for (const hpScale of coarseScales) {
    coarseCandidates.push(evaluateScales(damageScale, hpScale));
  }
}
coarseCandidates.sort(candidateOrder);
const coarseBest = coarseCandidates[0];
if (coarseBest === undefined) throw new Error("Tower T5 damage/HP coarse sweep produced no candidates");

console.log("[TOWER_T5_DAMAGE_HP_COARSE_BEST]", {
  exactTargetFound: coarseBest.allCalibrationInTarget,
  damageScale: coarseBest.damageScale,
  hpScale: coarseBest.hpScale,
  damageNerfPct: coarseBest.damageNerfPct,
  hpNerfPct: coarseBest.hpNerfPct,
  totalNerfPct: coarseBest.totalNerfPct,
  allCalibrationClear: coarseBest.allCalibrationClear,
  targetMiss: coarseBest.targetMiss,
  hpSpread: coarseBest.hpSpread,
  badonHpPct: coarseBest.badonRun?.result.clear ? coarseBest.badonRun.result.hpPercent : null,
});

const fineMinDamage = Math.max(MIN_SCALE, coarseBest.damageScale - FINE_RADIUS);
const fineMaxDamage = Math.min(1, coarseBest.damageScale + FINE_RADIUS);
const fineMinHp = Math.max(MIN_SCALE, coarseBest.hpScale - FINE_RADIUS);
const fineMaxHp = Math.min(1, coarseBest.hpScale + FINE_RADIUS);
const fineDamageScales = makeScaleRange(fineMinDamage, fineMaxDamage, FINE_STEP);
const fineHpScales = makeScaleRange(fineMinHp, fineMaxHp, FINE_STEP);
const fineCandidates: SweepCandidate[] = [];

for (const damageScale of fineDamageScales) {
  for (const hpScale of fineHpScales) {
    fineCandidates.push(evaluateScales(damageScale, hpScale));
  }
}

const allCandidates = [...coarseCandidates, ...fineCandidates].sort(candidateOrder);
const selected = allCandidates[0];
if (selected === undefined) throw new Error("Tower T5 damage/HP sweep produced no candidates");
const exactCandidate = allCandidates.find((candidate) => candidate.allCalibrationInTarget);

console.log("[TOWER_T5_DAMAGE_HP_MINIMAL_NERF_RESULT]", {
  exactTargetFound: exactCandidate !== undefined,
  damageScale: selected.damageScale,
  hpScale: selected.hpScale,
  damageNerfPct: selected.damageNerfPct,
  hpNerfPct: selected.hpNerfPct,
  totalNerfPct: selected.totalNerfPct,
  maxAxisNerfPct: selected.maxAxisNerfPct,
  allCalibrationClear: selected.allCalibrationClear,
  allCalibrationInTarget: selected.allCalibrationInTarget,
  targetMiss: selected.targetMiss,
  hpSpread: selected.hpSpread,
});

console.log("[TOWER_T5_DAMAGE_HP_CALIBRATION_MATRIX]");
console.table(selected.calibrationRuns.map(({ weapon, traitId, traitValue, result }) => ({
  family: weapon.family,
  weapon: weapon.label,
  bestTrait: traitId,
  traitValue,
  clear: result.clear,
  hpPct: result.hpPercent,
  seconds: result.seconds,
  potions: result.potionsUsed,
  finalProgressPct: result.bossProgressPercent,
  dps: result.observedDps,
  incomingDps: result.incomingDps,
})));

console.log("[TOWER_T5_DAMAGE_HP_BADON_CHECK]", selected.badonRun === undefined ? null : {
  weapon: selected.badonRun.weapon.label,
  bestTrait: selected.badonRun.traitId,
  traitValue: selected.badonRun.traitValue,
  clear: selected.badonRun.result.clear,
  hpPct: selected.badonRun.result.hpPercent,
  seconds: selected.badonRun.result.seconds,
  potions: selected.badonRun.result.potionsUsed,
  finalProgressPct: selected.badonRun.result.bossProgressPercent,
  dps: selected.badonRun.result.observedDps,
  incomingDps: selected.badonRun.result.incomingDps,
});

console.log("[TOWER_T5_DAMAGE_HP_FRONTIER]");
console.table(
  allCandidates
    .filter((candidate) => candidate.allCalibrationClear)
    .slice(0, 12)
    .map((candidate) => ({
      damageNerfPct: candidate.damageNerfPct,
      hpNerfPct: candidate.hpNerfPct,
      totalNerfPct: candidate.totalNerfPct,
      allInTarget: candidate.allCalibrationInTarget,
      targetMiss: candidate.targetMiss,
      hpSpread: candidate.hpSpread,
      minHp: Math.min(...candidate.calibrationRuns.map(({ result }) => result.hpPercent)),
      maxHp: Math.max(...candidate.calibrationRuns.map(({ result }) => result.hpPercent)),
      badonHp: candidate.badonRun?.result.clear ? candidate.badonRun.result.hpPercent : "FAIL",
    })),
);

if (exactCandidate === undefined) {
  console.log("[TOWER_T5_DAMAGE_HP_NO_EXACT_TARGET]", {
    message: "No damage/HP pair put Clarent, Wildfire, Ursine and Bloodletter all inside the 8-15% HP target window.",
    closestDamageNerfPct: selected.damageNerfPct,
    closestHpNerfPct: selected.hpNerfPct,
    badonIsNotPartOfTarget: true,
  });
}
