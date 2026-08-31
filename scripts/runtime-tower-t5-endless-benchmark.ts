import {
  AUTHORED_AWAKENED_WEAPON_BALANCE,
  TOWER_FACTIONS,
  TOWER_FACTION_TIER_COMBAT_MULTIPLIER,
  getTowerDepthDifficultyMultiplier,
  type TowerFactionId,
} from "@game/data";
import {
  getTowerBlockDefinition,
  type TowerBlockDefinition,
} from "@game/gameplay";
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

const TIER = 5 as const;
const WEAPON_ENCHANTMENT = 4 as const;
const EQUIPMENT_ENCHANTMENT = 3 as const;
const STRAIN = 10;
const POTION_CAP = 2;
const TOWER_SEED = "tower-endless-t5-global-benchmark";
const ENDLESS_START_BLOCK_INDEX = 5;
const ENDLESS_SCAN_BLOCK_COUNT = 500;
const ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
const SEGMENT_INDEX = 9;
const mastery = artifactBenchmarkMasteryProfile(TIER);

const COMBAT_TRAITS = [
  "item_power",
  "auto_attack_damage",
  "ability_power",
  "cooldown_reduction",
  "max_health",
  "defense",
  "life_steal",
] as const satisfies readonly AwakenedTraitId[];

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

function blockProgressPercent(result: CombatRuntimeBenchmarkResult): number {
  if (result.clear) return 100;
  const completedEncounters = Math.max(0, result.encounterReached - 1);
  return Number((((completedEncounters + result.encounterProgressPercent / 100) / 5) * 100).toFixed(1));
}

function findClosestT5FactionBlocks(): readonly TowerBlockDefinition[] {
  const candidates: TowerBlockDefinition[] = [];
  for (
    let blockIndex = ENDLESS_START_BLOCK_INDEX;
    blockIndex < ENDLESS_START_BLOCK_INDEX + ENDLESS_SCAN_BLOCK_COUNT;
    blockIndex += 1
  ) {
    const block = getTowerBlockDefinition(blockIndex, TOWER_SEED);
    if (block.source === "endless" && block.tier === TIER) candidates.push(block);
  }

  let bestWindow: readonly TowerBlockDefinition[] | undefined;
  for (let left = 0; left < candidates.length; left += 1) {
    const seen = new Set<TowerFactionId>();
    for (let right = left; right < candidates.length; right += 1) {
      const candidate = candidates[right];
      if (candidate === undefined) continue;
      seen.add(candidate.factionId);
      if (seen.size !== TOWER_FACTIONS.length) continue;
      const window = candidates.slice(left, right + 1);
      if (
        bestWindow === undefined
        || (window.at(-1)?.blockIndex ?? Number.POSITIVE_INFINITY)
          - (window[0]?.blockIndex ?? 0)
          < (bestWindow.at(-1)?.blockIndex ?? Number.POSITIVE_INFINITY)
            - (bestWindow[0]?.blockIndex ?? 0)
      ) {
        bestWindow = window;
      }
      break;
    }
  }

  if (bestWindow === undefined) {
    throw new Error("Could not find clustered T5 Endless blocks for all factions");
  }

  const midpoint = (
    (bestWindow[0]?.blockIndex ?? 0)
    + (bestWindow.at(-1)?.blockIndex ?? 0)
  ) / 2;
  return TOWER_FACTIONS.map((factionId) => {
    const block = bestWindow
      .filter((candidate) => candidate.factionId === factionId)
      .sort((a, b) => Math.abs(a.blockIndex - midpoint) - Math.abs(b.blockIndex - midpoint))[0];
    if (block === undefined) throw new Error(`Missing T5 Endless block for ${factionId}`);
    return block;
  }).sort((a, b) => a.blockIndex - b.blockIndex);
}

function resolveBlockEncounters(block: TowerBlockDefinition): readonly CombatRuntimeBenchmarkEncounter[] {
  return Array.from({ length: 5 }, (_, offset) => resolveTowerEncounter(block.floorStart + offset, TOWER_SEED))
    .map((encounter) => ({
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: encounter.combatProfile,
    }));
}

function runTowerCase(
  block: TowerBlockDefinition,
  authoredEncounters: readonly CombatRuntimeBenchmarkEncounter[],
  weaponItemId: string,
  label: string,
  heroDamageMultiplier: number,
  incomingDamageReductionPercent: number,
  traitId: AwakenedTraitId,
): CombatRuntimeBenchmarkResult {
  return runCombatRuntimeBenchmark({
    label,
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, TIER, block.factionId),
    zoneDefId: ZONE_DEF_ID,
    segmentIndex: SEGMENT_INDEX,
    enchantment: WEAPON_ENCHANTMENT,
    equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
    awakenedWeapon: {
      strain: STRAIN,
      traits: [{ traitId, value: getOptimizedTraitValueAtStrain(traitId, STRAIN) }],
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

const selectedBlocks = findClosestT5FactionBlocks();

console.log("[TOWER_T5_ENDLESS_REFERENCE]", {
  tier: TIER,
  mode: "endless",
  weaponEnchantment: WEAPON_ENCHANTMENT,
  equipmentEnchantment: EQUIPMENT_ENCHANTMENT,
  strain: STRAIN,
  traitPolicy: "single trait, max legal non-critical value after 10 modifications",
  familyMastery: mastery.familyMasteryLevel,
  specializationMastery: mastery.specializationMasteryLevel,
  siblingMastery: mastery.siblingSpecializationMasteryLevel,
  potionCap: POTION_CAP,
  seed: TOWER_SEED,
  selectionPolicy: "one real T5 block per faction, minimum depth span in first 500 Endless blocks",
});

console.log("[TOWER_T5_ENDLESS_SELECTED_BLOCKS]");
console.table(selectedBlocks.map((block) => ({
  faction: block.factionId,
  blockId: block.id,
  blockIndex: block.blockIndex,
  floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
  normalization: TOWER_FACTION_TIER_COMBAT_MULTIPLIER[block.factionId][TIER],
  depthStart: getTowerDepthDifficultyMultiplier(block.floorStart),
  depthEnd: getTowerDepthDifficultyMultiplier(block.floorEnd),
  majorBoss: block.majorBoss,
})));

console.log("[TOWER_T5_ENDLESS_TRAIT_VALUES]");
console.table(COMBAT_TRAITS.map((traitId) => ({
  trait: traitId,
  valueAtStrain10: getOptimizedTraitValueAtStrain(traitId, STRAIN),
})));

const bestRuns = selectedBlocks.flatMap((block) => {
  const authoredEncounters = resolveBlockEncounters(block);
  const capeItemId = `item_cape_t${String(TIER)}_${block.factionId}`;
  const counterWeapons = ARTIFACT_WEAPON_BENCHMARK_SPECS
    .map((weapon) => {
      const weaponItemId = weapon.itemId(TIER);
      const modifiers = resolveFactionCombatModifiers(
        { weaponItemId, capeItemId },
        { factionId: block.factionId, tier: TIER, activity: "tower" },
      );
      return { weapon, weaponItemId, modifiers };
    })
    .filter(({ modifiers }) => modifiers.outgoingDamageBonusPercent > 0);

  if (counterWeapons.length === 0) {
    throw new Error(`No counter weapons found for ${block.factionId}`);
  }

  console.log(`[TOWER_T5_ENDLESS_${block.factionId.toUpperCase()}_ENCOUNTERS]`);
  console.table(Array.from({ length: 5 }, (_, offset) => resolveTowerEncounter(
    block.floorStart + offset,
    TOWER_SEED,
  )).map((encounter) => ({
    floor: encounter.floorDefinition.floor,
    role: encounter.floorDefinition.role,
    monster: encounter.monsterDefinitionId,
    hp: encounter.combatProfile.hp,
    damage: encounter.combatProfile.damage,
    armor: encounter.combatProfile.armor,
    magicResistance: encounter.combatProfile.magicResistance,
  })));

  return counterWeapons.map(({ weapon, weaponItemId, modifiers }) => {
    const heroDamageMultiplier = (
      1 + modifiers.outgoingDamageBonusPercent / 100
    ) * modifiers.factionResilienceDamageMultiplier;
    const candidates = COMBAT_TRAITS.map((traitId) => ({
      traitId,
      traitValue: getOptimizedTraitValueAtStrain(traitId, STRAIN),
      result: runTowerCase(
        block,
        authoredEncounters,
        weaponItemId,
        `tower_t5_endless_${block.factionId}_${block.blockIndex}_${weapon.family}_${weapon.label}_${traitId}`,
        heroDamageMultiplier,
        modifiers.incomingDamageReductionPercent,
        traitId,
      ),
    })).sort((a, b) => compareResults(a.result, b.result));
    const best = candidates[0];
    if (best === undefined) throw new Error(`No benchmark result for ${weapon.label}`);
    return { block, weapon, modifiers, ...best };
  });
});

console.log("[TOWER_T5_ENDLESS_WEAPON_MATRIX]");
console.table(bestRuns.map(({ block, weapon, modifiers, traitId, traitValue, result }) => ({
  faction: block.factionId,
  floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
  family: weapon.family,
  weapon: weapon.label,
  bonusPct: modifiers.outgoingDamageBonusPercent,
  bestTrait: traitId,
  traitValue,
  clear: result.clear,
  hpPct: result.hpPercent,
  blockProgressPct: blockProgressPercent(result),
  encounterReached: result.encounterReached,
  encounterProgressPct: result.encounterProgressPercent,
  potions: result.potionsUsed,
  seconds: result.seconds,
  dps: result.observedDps,
  incomingDps: result.incomingDps,
})));

const factionSummary = selectedBlocks.map((block) => {
  const runs = bestRuns.filter((run) => run.block.id === block.id);
  const clears = runs.filter((run) => run.result.clear);
  const averageHpPct = clears.length === 0
    ? 0
    : Number((clears.reduce((sum, run) => sum + run.result.hpPercent, 0) / clears.length).toFixed(1));
  const averageProgressPct = Number((runs.reduce(
    (sum, run) => sum + blockProgressPercent(run.result),
    0,
  ) / runs.length).toFixed(1));
  return {
    faction: block.factionId,
    floors: `${String(block.floorStart)}-${String(block.floorEnd)}`,
    normalization: TOWER_FACTION_TIER_COMBAT_MULTIPLIER[block.factionId][TIER],
    depthMultiplier: getTowerDepthDifficultyMultiplier(block.floorStart),
    testedWeapons: runs.length,
    clearCount: clears.length,
    failCount: runs.length - clears.length,
    clearRatePct: Number(((clears.length / runs.length) * 100).toFixed(1)),
    averageClearHpPct: averageHpPct,
    averageBlockProgressPct: averageProgressPct,
  };
});

console.log("[TOWER_T5_ENDLESS_FACTION_SUMMARY]");
console.table(factionSummary);

const totalClears = bestRuns.filter((run) => run.result.clear).length;
console.log("[TOWER_T5_ENDLESS_GLOBAL_SUMMARY]", {
  factions: factionSummary.length,
  testedWeaponBlockPairs: bestRuns.length,
  clearCount: totalClears,
  failCount: bestRuns.length - totalClears,
  clearRatePct: Number(((totalClears / bestRuns.length) * 100).toFixed(1)),
  allFavorableClear: totalClears === bestRuns.length,
  targetSurvivorHpPct: "10-25",
  byFaction: factionSummary,
});
