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
} from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const FLOOR_START = 21;
const FLOOR_END = 25;
const TIER = 5 as const;
const FACTION = "morgana" as const;
const ENCHANTMENT = 3 as const;
const POTION_CAP = 2;
const TOWER_SEED = "tower-benchmark-21-25";
const ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
const SEGMENT_INDEX = 9;
const CAPE_ITEM_ID = `item_cape_t${TIER}_${FACTION}`;

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

console.log("[TOWER_21_25_REFERENCE]", {
  floors: `${String(FLOOR_START)}-${String(FLOOR_END)}`,
  tier: TIER,
  faction: FACTION,
  enchantment: ENCHANTMENT,
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
  dungeon: encounter.dungeonDefinitionId,
  dungeonEncounter: encounter.dungeonEncounterIndex,
  monster: encounter.monsterDefinitionId,
  hp: encounter.combatProfile.hp,
  damage: encounter.combatProfile.damage,
  armor: encounter.combatProfile.armor,
  magicResistance: encounter.combatProfile.magicResistance,
})));

const weaponRuns = ARTIFACT_WEAPON_BENCHMARK_SPECS
  .map((weapon) => {
    const weaponItemId = weapon.itemId(TIER);
    const modifiers = resolveFactionCombatModifiers(
      { weaponItemId, capeItemId: CAPE_ITEM_ID },
      { factionId: FACTION, tier: TIER, activity: "tower" },
    );
    return { weapon, weaponItemId, modifiers };
  })
  .filter(({ modifiers }) => modifiers.outgoingDamageBonusPercent > 0)
  .map(({ weapon, weaponItemId, modifiers }) => {
    const heroDamageMultiplier = (
      1 + modifiers.outgoingDamageBonusPercent / 100
    ) * modifiers.factionResilienceDamageMultiplier;
    const result = runCombatRuntimeBenchmark({
      label: `tower_21_25_${weapon.family}_${weapon.label}`,
      weaponItemId,
      equipmentItemIds: artifactDungeonEquipment(weaponItemId, TIER, FACTION),
      zoneDefId: ZONE_DEF_ID,
      segmentIndex: SEGMENT_INDEX,
      enchantment: ENCHANTMENT,
      familyMasteryLevel: mastery.familyMasteryLevel,
      specializationMasteryLevel: mastery.specializationMasteryLevel,
      siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
      useHealthPotions: true,
      healthPotionQuantity: POTION_CAP,
      heroDamageMultiplier,
      incomingDamageReductionPercent: modifiers.incomingDamageReductionPercent,
      authoredEncounters,
    });

    return { weapon, weaponItemId, modifiers, heroDamageMultiplier, result };
  });

console.log("[TOWER_21_25_COUNTER_MATRIX]");
console.table(weaponRuns.map(({ weapon, modifiers, heroDamageMultiplier, result }) => {
  const failedEncounter = result.encounters.find((encounter) => !encounter.cleared);
  const failedFloor = failedEncounter === undefined
    ? null
    : FLOOR_START + failedEncounter.encounterIndex - 1;
  const floorReached = FLOOR_START + result.encounterReached - 1;
  return {
    family: weapon.family,
    weapon: weapon.label,
    bonusPct: modifiers.outgoingDamageBonusPercent,
    towerResilienceMultiplier: modifiers.factionResilienceDamageMultiplier,
    effectiveOutgoingMultiplier: Number(heroDamageMultiplier.toFixed(4)),
    incomingReductionPct: modifiers.incomingDamageReductionPercent,
    clear: result.clear,
    failedFloor,
    floorReached,
    hpPct: result.hpPercent,
    potions: result.potionsUsed,
    seconds: result.seconds,
    floor25ProgressPct: result.bossProgressPercent,
    dps: result.observedDps,
    incomingDps: result.incomingDps,
  };
}));

console.log("[TOWER_21_25_FLOOR_MATRIX]");
console.table(weaponRuns.flatMap(({ weapon, result }) => result.encounters.map((telemetry) => {
  const floor = FLOOR_START + telemetry.encounterIndex - 1;
  const resolved = resolvedFloors[floor - FLOOR_START];
  return {
    weapon: weapon.label,
    floor,
    role: resolved?.floorDefinition.role ?? "unknown",
    clear: telemetry.cleared,
    seconds: telemetry.seconds,
    hpBeforePct: telemetry.hpBeforePercent,
    hpAfterPct: telemetry.hpAfterPercent,
    enemyProgressPct: telemetry.encounterProgressPercent,
    potions: telemetry.potionsUsed,
    dps: telemetry.observedDps,
    incomingDps: telemetry.incomingDps,
  };
})));

const clears = weaponRuns.filter(({ result }) => result.clear);
const failures = weaponRuns.filter(({ result }) => !result.clear);
console.log("[TOWER_21_25_SUMMARY]", {
  testedWeapons: weaponRuns.length,
  clearCount: clears.length,
  failCount: failures.length,
  clears: clears.map(({ weapon }) => weapon.label),
  failures: failures.map(({ weapon, result }) => ({
    weapon: weapon.label,
    failedFloor: FLOOR_START + result.encounterReached - 1,
    encounterProgressPct: result.encounterProgressPercent,
  })),
});
