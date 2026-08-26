import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  DUNGEON_DEFINITIONS,
  KEEPER_T4_DUNGEON_ID,
} from "../apps/client/src/data/dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const TIER = 4 as const;
const ENCHANTMENT = 3 as const;
const MASTERY_LEVEL = 40;
const REPORTED_POTION_CAP = 2;
const ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
const SEGMENT_INDEX = 9;

const REFERENCE_WEAPONS = [
  { family: "Sword", label: "Broadsword", itemId: "item_weapon_sword_t4_broadsword" },
  { family: "Bow", label: "Longbow", itemId: "item_weapon_bow_t4_longbow" },
  { family: "Fire", label: "Infernal Staff", itemId: "item_weapon_staff_t4_infernal" },
  { family: "Gloves", label: "Spiked Gauntlets", itemId: "item_weapon_gloves_t4_spiked_gauntlets" },
  { family: "Dagger", label: "Dagger Pair", itemId: "item_weapon_dagger_t4_pair" },
] as const;

function equipmentFor(weaponItemId: string, faction: string): readonly string[] {
  const items: string[] = [
    `item_helmet_t${TIER}_reinforced`,
    `item_armor_t${TIER}_leather`,
    `item_boots_t${TIER}_leather`,
    `item_cape_t${TIER}_${faction.toLowerCase()}`,
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${TIER}_reinforced`);
  }
  return items;
}

function runDungeon(input: {
  readonly label: string;
  readonly weaponItemId: string;
  readonly dungeonDefinitionId: string;
  readonly faction: string;
}) {
  return runCombatRuntimeBenchmark({
    label: input.label,
    weaponItemId: input.weaponItemId,
    equipmentItemIds: equipmentFor(input.weaponItemId, input.faction),
    zoneDefId: ZONE_DEF_ID,
    segmentIndex: SEGMENT_INDEX,
    dungeonDefinitionId: input.dungeonDefinitionId,
    enchantment: ENCHANTMENT,
    familyMasteryLevel: MASTERY_LEVEL,
    specializationMasteryLevel: MASTERY_LEVEL,
    siblingSpecializationMasteryLevel: 0,
    useHealthPotions: true,
  });
}

function summarize(result: ReturnType<typeof runCombatRuntimeBenchmark>) {
  const failedEncounter = result.encounters.find((encounter) => !encounter.cleared);
  return {
    clear: result.clear,
    seconds: result.seconds,
    hpPct: result.hpPercent,
    potions: result.potionsUsed,
    withinReportedTwoPotionCap: result.potionsUsed <= REPORTED_POTION_CAP,
    encounterReached: result.encounterReached,
    bossProgressPct: result.bossProgressPercent,
    failedEncounter: failedEncounter?.encounterIndex ?? null,
    failedEncounterProgressPct: failedEncounter?.encounterProgressPercent ?? 100,
    dps: result.observedDps,
    incomingDps: result.incomingDps,
  };
}

const keeper = DUNGEON_DEFINITIONS.find((dungeon) => dungeon.id === KEEPER_T4_DUNGEON_ID);
if (keeper === undefined) throw new Error("Missing Keeper T4 dungeon");

const reportedLongbow = runDungeon({
  label: "reported_longbow_t4_3_mastery40_keeper",
  weaponItemId: "item_weapon_bow_t4_longbow",
  dungeonDefinitionId: keeper.id,
  faction: keeper.faction,
});

console.log("[DUNGEON_REPORTED_CASE_REFERENCE]", {
  weapon: "Longbow",
  tier: TIER,
  enchantment: ENCHANTMENT,
  familyMastery: MASTERY_LEVEL,
  specializationMastery: MASTERY_LEVEL,
  siblingMastery: 0,
  matchingCape: true,
  reportedPotionCap: REPORTED_POTION_CAP,
  note: "Harness seeds a reserve; if potionsUsed <= 2 the runtime result is identical to a two-potion inventory for this deterministic run.",
});
console.log("[DUNGEON_REPORTED_CASE]", summarize(reportedLongbow));
console.log("[DUNGEON_REPORTED_CASE_ENCOUNTERS]");
console.table(reportedLongbow.encounters.map((encounter) => ({
  encounter: encounter.encounterIndex,
  clear: encounter.cleared,
  seconds: encounter.seconds,
  hpBeforePct: encounter.hpBeforePercent,
  hpAfterPct: encounter.hpAfterPercent,
  progressPct: encounter.encounterProgressPercent,
  potions: encounter.potionsUsed,
  dps: encounter.observedDps,
  incomingDps: encounter.incomingDps,
})));

const t4Dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === TIER);

const keeperRows = REFERENCE_WEAPONS.map((weapon) => ({
  family: weapon.family,
  weapon: weapon.label,
  ...summarize(runDungeon({
    label: `keeper_t4_${weapon.family.toLowerCase()}`,
    weaponItemId: weapon.itemId,
    dungeonDefinitionId: keeper.id,
    faction: keeper.faction,
  })),
}));
console.log("[DUNGEON_KEEPER_T4_REFERENCE_WEAPONS]");
console.table(keeperRows);

const longbowDungeonRows = t4Dungeons.map((dungeon) => ({
  dungeon: dungeon.id,
  faction: dungeon.faction,
  ...summarize(runDungeon({
    label: `longbow_t4_${dungeon.faction.toLowerCase()}`,
    weaponItemId: "item_weapon_bow_t4_longbow",
    dungeonDefinitionId: dungeon.id,
    faction: dungeon.faction,
  })),
}));
console.log("[DUNGEON_T4_LONGBOW_MATRIX]");
console.table(longbowDungeonRows);

const fullMatrixRows = t4Dungeons.flatMap((dungeon) => REFERENCE_WEAPONS.map((weapon) => ({
  dungeon: dungeon.id,
  faction: dungeon.faction,
  family: weapon.family,
  weapon: weapon.label,
  ...summarize(runDungeon({
    label: `${dungeon.id}_${weapon.family.toLowerCase()}`,
    weaponItemId: weapon.itemId,
    dungeonDefinitionId: dungeon.id,
    faction: dungeon.faction,
  })),
})));
console.log("[DUNGEON_T4_FULL_MATRIX]");
console.table(fullMatrixRows);

const clearSummary = t4Dungeons.map((dungeon) => {
  const rows = fullMatrixRows.filter((row) => row.dungeon === dungeon.id);
  const clears = rows.filter((row) => row.clear && row.withinReportedTwoPotionCap);
  return {
    dungeon: dungeon.id,
    faction: dungeon.faction,
    clearCount: `${String(clears.length)}/${String(REFERENCE_WEAPONS.length)}`,
    minClearHpPct: clears.length > 0 ? Math.min(...clears.map((row) => row.hpPct)) : null,
    maxClearHpPct: clears.length > 0 ? Math.max(...clears.map((row) => row.hpPct)) : null,
    maxPotionsUsed: rows.length > 0 ? Math.max(...rows.map((row) => row.potions)) : null,
  };
});
console.log("[DUNGEON_T4_CLEAR_SUMMARY]");
console.table(clearSummary);
