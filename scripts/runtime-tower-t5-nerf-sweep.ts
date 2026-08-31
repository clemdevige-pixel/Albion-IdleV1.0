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
const FINE_RADIUS = 0.02;
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
  offensiveScale: number,
  durabilityScale: number,
): readonly CombatRuntimeBenchmarkEncounter[] {
  return resolvedFloors.map((encounter) => ({
    monsterDefinitionId: encounter.monsterDefinitionId,
    profile: {
      hp: scaleProfile(encounter.combatProfile.hp, durabilityScale),
      damage: scaleProfile(encounter.combatProfile.damage, offensiveScale),
      attackSpeed: encounter.combatProfile.attackSpeed,
      armor: scaleProfile(encounter.combatProfile.armor, durabilityScale),
      magicResistance: scaleProfile(encounter.combatProfile.magicResistance, durabilityScale),
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
  readonly offensiveScale: number;
  readonly durabilityScale: number;
  readonly offensiveNerfPct: number;
  readonly durabilityNerfPct: number;
  readonly totalNerfPct: number;
  readonly maxAxisNerfPct: number;
  readonly bestRuns: readonly BestRun[];
  readonly allClear: boolean;
  readonly allInTarget: boolean;
  readonly targetMiss: number;
  readonly hpSpread: number;
};

function hpTargetDistance(hp: number, clear: boolean): number {
  if (!clear) return TARGET_MIN_HP + 100;
  if (hp < TARGET_MIN_HP) return TARGET_MIN_HP - hp;
  if (hp > TARGET_MAX_HP) return hp - TARGET_MAX_HP;
  return 0;
}

function evaluateScales(offensiveScale: number, durabilityScale: number): SweepCandidate {
  const encounters = buildScaledEncounters(offensiveScale, durabilityScale);
  const bestRuns = counterWeapons.map(({ weapon, weaponItemId, modifiers, heroDamageMultiplier }) => {
    const candidates = COMBAT_TRAITS.map((traitId) => {
      const traitValue = getOptimizedTraitValueAtStrain(traitId, STRAIN);
      const result = runTowerCase(
        weaponItemId,
        `tower_21_25_t5_4_s10_o${offensiveScale.toFixed(3)}_d${durabilityScale.toFixed(3)}_${weapon.family}_${traitId}`,
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

  const allClear = bestRuns.every(({ result }) => result.clear);
  const allInTarget = bestRuns.every(({ result }) => (
    result.clear && result.hpPercent >= TARGET_MIN_HP && result.hpPercent <= TARGET_MAX_HP
  ));
  const targetMiss = bestRuns.reduce(
    (total, { result }) => total + hpTargetDistance(result.hpPercent, result.clear),
    0,
  );
  const hpValues = bestRuns.filter(({ result }) => result.clear).map(({ result }) => result.hpPercent);
  const hpSpread = hpValues.length === 0 ? 100 : Math.max(...hpValues) - Math.min(...hpValues);
  const offensiveNerfPct = (1 - offensiveScale) * 100;
  const durabilityNerfPct = (1 - durabilityScale) * 100;

  return {
    offensiveScale,
    durabilityScale,
    offensiveNerfPct: Number(offensiveNerfPct.toFixed(1)),
    durabilityNerfPct: Number(durabilityNerfPct.toFixed(1)),
    totalNerfPct: Number((offensiveNerfPct + durabilityNerfPct).toFixed(1)),
    maxAxisNerfPct: Number(Math.max(offensiveNerfPct, durabilityNerfPct).toFixed(1)),
    bestRuns,
    allClear,
    allInTarget,
    targetMiss: Number(targetMiss.toFixed(1)),
    hpSpread: Number(hpSpread.toFixed(1)),
  };
}

function candidateOrder(a: SweepCandidate, b: SweepCandidate): number {
  if (a.allInTarget !== b.allInTarget) return a.allInTarget ? -1 : 1;
  if (a.allClear !== b.allClear) return a.allClear ? -1 : 1;
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

console.log("[TOWER_T5_2D_NERF_SWEEP_REFERENCE]", {
  floors: `${String(FLOOR_START)}-${String(FLOOR_END)}`,
  tier: TIER,
  faction: FACTION,
  weaponEnchantment: WEAPON_ENCHANTMENT,
  equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
  strain: STRAIN,
  targetHpPct: `${String(TARGET_MIN_HP)}-${String(TARGET_MAX_HP)}`,
  offensiveAxis: "enemy damage",
  durabilityAxis: "enemy hp + armor + magicResistance",
  coarseScaleRange: `${MIN_SCALE.toFixed(2)}-1.00`,
  coarseStep: COARSE_STEP,
  fineStep: FINE_STEP,
});

const coarseCandidates: SweepCandidate[] = [];
const coarseScales = makeScaleRange(MIN_SCALE, 1, COARSE_STEP);
for (const offensiveScale of coarseScales) {
  for (const durabilityScale of coarseScales) {
    coarseCandidates.push(evaluateScales(offensiveScale, durabilityScale));
  }
}
coarseCandidates.sort(candidateOrder);
const coarseBest = coarseCandidates[0];
if (coarseBest === undefined) throw new Error("Tower T5 2D coarse sweep produced no candidates");

console.log("[TOWER_T5_2D_COARSE_BEST]", {
  exactTargetFound: coarseBest.allInTarget,
  offensiveScale: coarseBest.offensiveScale,
  durabilityScale: coarseBest.durabilityScale,
  offensiveNerfPct: coarseBest.offensiveNerfPct,
  durabilityNerfPct: coarseBest.durabilityNerfPct,
  totalNerfPct: coarseBest.totalNerfPct,
  allClear: coarseBest.allClear,
  targetMiss: coarseBest.targetMiss,
  hpSpread: coarseBest.hpSpread,
});

const fineMinOffensive = Math.max(MIN_SCALE, coarseBest.offensiveScale - FINE_RADIUS);
const fineMaxOffensive = Math.min(1, coarseBest.offensiveScale + FINE_RADIUS);
const fineMinDurability = Math.max(MIN_SCALE, coarseBest.durabilityScale - FINE_RADIUS);
const fineMaxDurability = Math.min(1, coarseBest.durabilityScale + FINE_RADIUS);
const fineOffensiveScales = makeScaleRange(fineMinOffensive, fineMaxOffensive, FINE_STEP);
const fineDurabilityScales = makeScaleRange(fineMinDurability, fineMaxDurability, FINE_STEP);
const fineCandidates: SweepCandidate[] = [];

for (const offensiveScale of fineOffensiveScales) {
  for (const durabilityScale of fineDurabilityScales) {
    fineCandidates.push(evaluateScales(offensiveScale, durabilityScale));
  }
}

const allCandidates = [...coarseCandidates, ...fineCandidates].sort(candidateOrder);
const selected = allCandidates[0];
if (selected === undefined) throw new Error("Tower T5 2D nerf sweep produced no candidates");

const exactCandidates = allCandidates
  .filter((candidate) => candidate.allInTarget)
  .sort(candidateOrder);
const exactCandidate = exactCandidates[0];

console.log("[TOWER_T5_2D_MINIMAL_NERF_RESULT]", {
  exactTargetFound: exactCandidate !== undefined,
  offensiveScale: selected.offensiveScale,
  durabilityScale: selected.durabilityScale,
  offensiveNerfPct: selected.offensiveNerfPct,
  durabilityNerfPct: selected.durabilityNerfPct,
  totalNerfPct: selected.totalNerfPct,
  maxAxisNerfPct: selected.maxAxisNerfPct,
  allClear: selected.allClear,
  allInTarget: selected.allInTarget,
  targetMiss: selected.targetMiss,
  hpSpread: selected.hpSpread,
});

console.log("[TOWER_T5_2D_MINIMAL_NERF_WEAPON_MATRIX]");
console.table(selected.bestRuns.map(({ weapon, traitId, traitValue, result }) => ({
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

console.log("[TOWER_T5_2D_FRONTIER]" );
console.table(
  allCandidates
    .filter((candidate) => candidate.allClear)
    .slice(0, 12)
    .map((candidate) => ({
      offensiveNerfPct: candidate.offensiveNerfPct,
      durabilityNerfPct: candidate.durabilityNerfPct,
      totalNerfPct: candidate.totalNerfPct,
      allInTarget: candidate.allInTarget,
      targetMiss: candidate.targetMiss,
      hpSpread: candidate.hpSpread,
      minHp: Math.min(...candidate.bestRuns.map(({ result }) => result.hpPercent)),
      maxHp: Math.max(...candidate.bestRuns.map(({ result }) => result.hpPercent)),
    })),
);

if (exactCandidate === undefined) {
  console.log("[TOWER_T5_2D_NO_EXACT_TARGET]", {
    message: "No offensive/durability pair put all five optimized weapons inside the 8-15% HP target window.",
    closestOffensiveNerfPct: selected.offensiveNerfPct,
    closestDurabilityNerfPct: selected.durabilityNerfPct,
    note: "If the spread remains structural, inspect weapon outliers before adding encounter-specific tuning.",
  });
}
