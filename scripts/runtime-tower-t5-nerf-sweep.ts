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
const SCALE_STEP = 0.01;
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

function buildScaledEncounters(scale: number): readonly CombatRuntimeBenchmarkEncounter[] {
  return resolvedFloors.map((encounter) => ({
    monsterDefinitionId: encounter.monsterDefinitionId,
    profile: {
      hp: scaleProfile(encounter.combatProfile.hp, scale),
      damage: scaleProfile(encounter.combatProfile.damage, scale),
      attackSpeed: encounter.combatProfile.attackSpeed,
      armor: scaleProfile(encounter.combatProfile.armor, scale),
      magicResistance: scaleProfile(encounter.combatProfile.magicResistance, scale),
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
  readonly scale: number;
  readonly nerfPct: number;
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

function evaluateScale(scale: number): SweepCandidate {
  const encounters = buildScaledEncounters(scale);
  const bestRuns = counterWeapons.map(({ weapon, weaponItemId, modifiers, heroDamageMultiplier }) => {
    const candidates = COMBAT_TRAITS.map((traitId) => {
      const traitValue = getOptimizedTraitValueAtStrain(traitId, STRAIN);
      const result = runTowerCase(
        weaponItemId,
        `tower_21_25_t5_4_s10_scale_${scale.toFixed(2)}_${weapon.family}_${traitId}`,
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

  return {
    scale,
    nerfPct: Number(((1 - scale) * 100).toFixed(1)),
    bestRuns,
    allClear,
    allInTarget,
    targetMiss: Number(targetMiss.toFixed(1)),
    hpSpread: Number(hpSpread.toFixed(1)),
  };
}

console.log("[TOWER_T5_MINIMAL_NERF_SWEEP_REFERENCE]", {
  floors: `${String(FLOOR_START)}-${String(FLOOR_END)}`,
  tier: TIER,
  faction: FACTION,
  weaponEnchantment: WEAPON_ENCHANTMENT,
  equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
  strain: STRAIN,
  targetHpPct: `${String(TARGET_MIN_HP)}-${String(TARGET_MAX_HP)}`,
  scalingPolicy: "single global multiplier applied to enemy hp/damage/armor/magicResistance for all 5 floors",
  scaleRange: `${MIN_SCALE.toFixed(2)}-1.00`,
  step: SCALE_STEP,
});

const candidates: SweepCandidate[] = [];
for (let raw = 1; raw >= MIN_SCALE - 0.0001; raw -= SCALE_STEP) {
  const scale = Number(raw.toFixed(2));
  const candidate = evaluateScale(scale);
  candidates.push(candidate);
  console.log("[TOWER_T5_NERF_SWEEP_STEP]", {
    scale,
    nerfPct: candidate.nerfPct,
    allClear: candidate.allClear,
    allInTarget: candidate.allInTarget,
    hp: Object.fromEntries(candidate.bestRuns.map(({ weapon, result }) => [
      weapon.label,
      result.clear ? result.hpPercent : `FAIL:${String(result.encounterProgressPercent)}%`,
    ])),
  });
  if (candidate.allInTarget) break;
}

const exactCandidate = candidates.find((candidate) => candidate.allInTarget);
const closestCandidate = [...candidates].sort((a, b) => {
  if (a.allClear !== b.allClear) return a.allClear ? -1 : 1;
  if (a.targetMiss !== b.targetMiss) return a.targetMiss - b.targetMiss;
  if (a.hpSpread !== b.hpSpread) return a.hpSpread - b.hpSpread;
  return b.scale - a.scale;
})[0];
const selected = exactCandidate ?? closestCandidate;
if (selected === undefined) throw new Error("Tower T5 nerf sweep produced no candidates");

console.log("[TOWER_T5_MINIMAL_NERF_RESULT]", {
  exactTargetFound: exactCandidate !== undefined,
  scale: selected.scale,
  nerfPct: selected.nerfPct,
  allClear: selected.allClear,
  allInTarget: selected.allInTarget,
  targetMiss: selected.targetMiss,
  hpSpread: selected.hpSpread,
});

console.log("[TOWER_T5_MINIMAL_NERF_WEAPON_MATRIX]");
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

if (exactCandidate === undefined) {
  console.log("[TOWER_T5_MINIMAL_NERF_NO_EXACT_SINGLE_SCALE]", {
    message: "No single global block multiplier put all five optimized weapons inside the 8-15% HP target window.",
    closestScale: selected.scale,
    closestNerfPct: selected.nerfPct,
    note: "Inspect Badon separately before introducing any weapon-specific or encounter-specific tuning.",
  });
}
