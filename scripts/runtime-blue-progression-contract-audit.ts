import type { ZoneDefinitionId } from "@game/gameplay";

import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

const T3_ARMOR = [
  "item_iron_helmet",
  "item_leather_armor",
  "item_leather_boots",
  "item_traveler_cape",
] as const;
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T3_SHIELD = "item_shield_t3_reinforced";
const T4_SHIELD = "item_shield_t4_reinforced";

const BROADSWORD_T3 = "item_weapon_sword_t3_broadsword";
const BROADSWORD_T4 = "item_weapon_sword_t4_broadsword";

type Tier = 3 | 4;
type Enchantment = 0 | 1 | 2 | 3;
type GearMode = "none" | "t3_torso" | "t3_two_piece" | "full_t3" | "t4_torso" | "t4_two_piece" | "full_t4";
type ContractExpectation = "all_clear" | "not_all_clear";

interface RuntimeCheckpoint {
  readonly id: string;
  readonly zoneDefId: ZoneDefinitionId;
  readonly segmentIndex: number;
  readonly tier: Tier;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly gearMode: GearMode;
  readonly useHealthPotions: boolean;
}

interface ContractCheckpoint extends RuntimeCheckpoint {
  readonly contract: string;
  readonly expectation: ContractExpectation;
}

function shortWeaponName(itemId: string): string {
  return itemId
    .replace("item_weapon_", "")
    .replace("_t3_", " ")
    .replace("_t4_", " ");
}

function zoneName(zoneDefId: ZoneDefinitionId): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
}

function equipmentFor(
  weaponItemId: string,
  tier: Tier,
  gearMode: GearMode,
): readonly string[] {
  if (gearMode === "none") return [];
  if (gearMode === "t3_torso") return ["item_leather_armor"];
  if (gearMode === "t3_two_piece") return ["item_leather_armor", "item_iron_helmet"];
  if (gearMode === "t4_torso") {
    return ["item_armor_t4_leather", "item_iron_helmet", "item_leather_boots", "item_traveler_cape"];
  }
  if (gearMode === "t4_two_piece") {
    return ["item_armor_t4_leather", "item_helmet_t4_reinforced", "item_leather_boots", "item_traveler_cape"];
  }

  const items: string[] = gearMode === "full_t3" ? [...T3_ARMOR] : [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(tier === 3 ? T3_SHIELD : T4_SHIELD);
  }
  return items;
}

const BROADSWORD_CHECKPOINTS: readonly RuntimeCheckpoint[] = [
  { id: "forest_s10_starter", zoneDefId: WORLD_ZONE_IDS.forest, segmentIndex: 9, tier: 3, mastery: 1, enchantment: 0, gearMode: "none", useHealthPotions: false },
  { id: "swamp_s1_starter", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 0, tier: 3, mastery: 1, enchantment: 0, gearMode: "none", useHealthPotions: false },
  { id: "swamp_s3_t3_torso", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 2, tier: 3, mastery: 4, enchantment: 0, gearMode: "t3_torso", useHealthPotions: false },
  { id: "swamp_s6_t3_two_piece", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 5, tier: 3, mastery: 7, enchantment: 0, gearMode: "t3_two_piece", useHealthPotions: false },
  { id: "swamp_s10_full_t3", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 9, tier: 3, mastery: 10, enchantment: 0, gearMode: "full_t3", useHealthPotions: false },
  { id: "highland_s1_full_t3", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 0, tier: 3, mastery: 10, enchantment: 0, gearMode: "full_t3", useHealthPotions: false },
  { id: "highland_s1_full_t3_potion", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 0, tier: 3, mastery: 10, enchantment: 0, gearMode: "full_t3", useHealthPotions: true },
  { id: "highland_s4_t4_torso", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 3, tier: 4, mastery: 11, enchantment: 0, gearMode: "t4_torso", useHealthPotions: false },
  { id: "highland_s6_t4_two_piece", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 5, tier: 4, mastery: 12, enchantment: 0, gearMode: "t4_two_piece", useHealthPotions: false },
  { id: "highland_s10_full_t4", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 9, tier: 4, mastery: 14, enchantment: 0, gearMode: "full_t4", useHealthPotions: false },
  { id: "steppe_s1_full_t4_0", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 0, tier: 4, mastery: 14, enchantment: 0, gearMode: "full_t4", useHealthPotions: false },
  { id: "steppe_s6_full_t4_0", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 5, tier: 4, mastery: 16, enchantment: 0, gearMode: "full_t4", useHealthPotions: false },
  { id: "steppe_s10_full_t4_1", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 9, tier: 4, mastery: 18, enchantment: 1, gearMode: "full_t4", useHealthPotions: false },
  { id: "frostpeak_s1_full_t4_1", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 0, tier: 4, mastery: 18, enchantment: 1, gearMode: "full_t4", useHealthPotions: false },
  { id: "frostpeak_s4_full_t4_1", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 3, tier: 4, mastery: 19, enchantment: 1, gearMode: "full_t4", useHealthPotions: false },
  { id: "frostpeak_s8_full_t4_2", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 7, tier: 4, mastery: 21, enchantment: 2, gearMode: "full_t4", useHealthPotions: false },
  { id: "frostpeak_s10_full_t4_2", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, mastery: 22, enchantment: 2, gearMode: "full_t4", useHealthPotions: false },
  { id: "frostpeak_s10_full_t4_2_potion", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, mastery: 22, enchantment: 2, gearMode: "full_t4", useHealthPotions: true },
  { id: "frostpeak_s10_full_t4_3", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, mastery: 22, enchantment: 3, gearMode: "full_t4", useHealthPotions: false },
];

const BLUE_CONTRACT_CHECKPOINTS: readonly ContractCheckpoint[] = [
  { id: "forest_s10_starter", zoneDefId: WORLD_ZONE_IDS.forest, segmentIndex: 9, tier: 3, mastery: 1, enchantment: 0, gearMode: "none", useHealthPotions: false, expectation: "all_clear", contract: "starter weapon clears Forest S10 without potion" },
  { id: "swamp_s10_starter", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 9, tier: 3, mastery: 1, enchantment: 0, gearMode: "none", useHealthPotions: false, expectation: "not_all_clear", contract: "Swamp remains a real T3 progression wall" },
  { id: "swamp_s10_full_t3", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 9, tier: 3, mastery: 10, enchantment: 0, gearMode: "full_t3", useHealthPotions: false, expectation: "all_clear", contract: "full T3 clears Swamp S10 without potion" },
  { id: "highland_s1_full_t3", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 0, tier: 3, mastery: 10, enchantment: 0, gearMode: "full_t3", useHealthPotions: false, expectation: "not_all_clear", contract: "full T3 is not autonomous Highlands entry farm" },
  { id: "highland_s1_full_t3_potion", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 0, tier: 3, mastery: 10, enchantment: 0, gearMode: "full_t3", useHealthPotions: true, expectation: "all_clear", contract: "potions bridge the first Highlands step" },
  { id: "highland_s10_full_t4", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 9, tier: 4, mastery: 14, enchantment: 0, gearMode: "full_t4", useHealthPotions: false, expectation: "all_clear", contract: "full T4.0 clears Highlands" },
  { id: "steppe_s6_full_t4_0", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 5, tier: 4, mastery: 16, enchantment: 0, gearMode: "full_t4", useHealthPotions: false, expectation: "all_clear", contract: "T4.0 handles early/mid Steppe" },
  { id: "steppe_s10_full_t4_0", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 9, tier: 4, mastery: 18, enchantment: 0, gearMode: "full_t4", useHealthPotions: false, expectation: "not_all_clear", contract: "late Steppe still motivates first enchantment" },
  { id: "steppe_s10_full_t4_1", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 9, tier: 4, mastery: 18, enchantment: 1, gearMode: "full_t4", useHealthPotions: false, expectation: "all_clear", contract: "T4.1 is the intended late-Steppe progression tool" },
  { id: "frostpeak_s4_full_t4_1", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 3, tier: 4, mastery: 19, enchantment: 1, gearMode: "full_t4", useHealthPotions: false, expectation: "all_clear", contract: "T4.1 progresses through early Frostpeak" },
  { id: "frostpeak_s10_full_t4_2", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, mastery: 22, enchantment: 2, gearMode: "full_t4", useHealthPotions: false, expectation: "not_all_clear", contract: "T4.2 S10 is a difficult wall, not guaranteed AFK" },
  { id: "frostpeak_s10_full_t4_2_potion", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, mastery: 22, enchantment: 2, gearMode: "full_t4", useHealthPotions: true, expectation: "all_clear", contract: "potion/optimization can bridge T4.2 S10" },
  { id: "frostpeak_s10_full_t4_3", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, tier: 4, mastery: 22, enchantment: 3, gearMode: "full_t4", useHealthPotions: false, expectation: "all_clear", contract: "T4.3 is the reliable potion-free Blue S10 threshold" },
];

function runCheckpoint(checkpoint: RuntimeCheckpoint, weaponItemId: string) {
  return runCombatRuntimeBenchmark({
    label: checkpoint.id,
    weaponItemId,
    zoneDefId: checkpoint.zoneDefId,
    segmentIndex: checkpoint.segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId, checkpoint.tier, checkpoint.gearMode),
    masteryLevel: checkpoint.mastery,
    enchantment: checkpoint.enchantment,
    useHealthPotions: checkpoint.useHealthPotions,
  });
}

function runBroadswordAudit(): void {
  const rows = BROADSWORD_CHECKPOINTS.map((checkpoint) => {
    const weaponItemId = checkpoint.tier === 3 ? BROADSWORD_T3 : BROADSWORD_T4;
    const result = runCheckpoint(checkpoint, weaponItemId);
    const execution = result.abilities.find((ability) => ability.abilityId === "ability_sword_execution");
    return {
      checkpoint: checkpoint.id,
      zone: zoneName(checkpoint.zoneDefId),
      segment: checkpoint.segmentIndex + 1,
      tier: checkpoint.tier,
      enchantment: checkpoint.enchantment,
      mastery: checkpoint.mastery,
      gear: checkpoint.gearMode,
      potionMode: checkpoint.useHealthPotions,
      clear: result.clear,
      seconds: result.seconds,
      hp: result.hpPercent,
      potions: result.potionsUsed,
      encounters: result.encounterReached,
      dps: result.observedDps,
      damageTaken: result.damageReceived,
      executionCasts: execution?.casts ?? 0,
      executionDamage: execution?.directDamage ?? 0,
    };
  });

  console.log("[BROADSWORD_RUNTIME_PROGRESSION_AUDIT]");
  console.table(rows);
}

function contractPass(expectation: ContractExpectation, clears: number, total: number): boolean {
  return expectation === "all_clear" ? clears === total : clears < total;
}

function runGlobalContractAudit(): void {
  const detailRows: Array<Record<string, unknown>> = [];
  const summaryRows = BLUE_CONTRACT_CHECKPOINTS.map((checkpoint) => {
    const weapons = checkpoint.tier === 3 ? T3_WEAPONS : T4_WEAPONS;
    const results = weapons.map((weaponItemId) => ({
      weaponItemId,
      result: runCheckpoint(checkpoint, weaponItemId),
    }));

    for (const { weaponItemId, result } of results) {
      detailRows.push({
        checkpoint: checkpoint.id,
        weapon: shortWeaponName(weaponItemId),
        clear: result.clear,
        hp: result.hpPercent,
        potions: result.potionsUsed,
        seconds: result.seconds,
        dps: result.observedDps,
        encounters: result.encounterReached,
      });
    }

    const clearCount = results.filter(({ result }) => result.clear).length;
    const failingWeapons = results
      .filter(({ result }) => !result.clear)
      .map(({ weaponItemId }) => shortWeaponName(weaponItemId));
    const pass = contractPass(checkpoint.expectation, clearCount, results.length);

    return {
      checkpoint: checkpoint.id,
      contract: checkpoint.contract,
      expected: checkpoint.expectation,
      clears: `${clearCount}/${results.length}`,
      failingWeapons: failingWeapons.join(", ") || "-",
      verdict: pass ? "PASS" : "REVIEW",
    };
  });

  console.log("[BLUE_PROGRESSION_CONTRACT_CHECKPOINTS]");
  console.table(detailRows);
  console.log("[BLUE_PROGRESSION_CONTRACT_SUMMARY]");
  console.table(summaryRows);
  console.log("[BLUE_PROGRESSION_CONTRACT_RESULT]", {
    pass: summaryRows.every((row) => row.verdict === "PASS"),
    review: summaryRows.filter((row) => row.verdict !== "PASS").map((row) => row.checkpoint),
  });
}

console.log("[BLUE_BALANCE_AUDIT_REFERENCE]", {
  sourceOfTruth: "live CombatRuntime",
  broadswordFirst: true,
  globalContractSecond: true,
  badonIncludedFromT4: true,
});

runBroadswordAudit();
runGlobalContractAudit();
