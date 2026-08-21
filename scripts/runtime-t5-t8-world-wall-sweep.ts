import {
  getWorldProgressionTierContract,
  getWorldProgressionZoneContract,
  getWorldTierTransitionContract,
  type WorldProgressionEnchantment,
  type WorldProgressionTier,
} from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { resolveMonsterForEncounter } from "../apps/client/src/data/monsterContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 3 | WorldProgressionTier;
type EncounterTelemetry = ReturnType<typeof runCombatRuntimeBenchmark>["encounters"];

const TARGET_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly WorldProgressionTier[];
const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;
const SEGMENTS_PER_ZONE = 10;
const FINAL_SEGMENT_INDEX = SEGMENTS_PER_ZONE - 1;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) => `item_weapon_${family}_t${String(tier)}_${specialization}`);
}

function armorItemIds(tier: Tier): readonly string[] {
  if (tier === 3) return ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"];
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(`item_shield_t${String(tier)}_reinforced`);
  return items;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function zoneIdFor(tier: WorldProgressionTier, zoneIndex: number) {
  const { band } = getWorldProgressionTierContract(tier);
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneDefId === undefined) throw new Error(`Missing zone ${String(zoneIndex + 1)} for T${String(tier)}`);
  return zoneDefId;
}

interface SegmentRun {
  readonly tier: WorldProgressionTier;
  readonly zoneIndex: number;
  readonly zoneDefId: ReturnType<typeof zoneIdFor>;
  readonly zone: string;
  readonly segment: number;
  readonly weapon: string;
  readonly gear: string;
  readonly mastery: number;
  readonly clearNoPotion: boolean;
  readonly hpNoPotion: number;
  readonly clearPotion: boolean;
  readonly hpPotion: number;
  readonly potionsUsed: number;
  readonly telemetryNoPotion: EncounterTelemetry;
  readonly telemetryPotion: EncounterTelemetry;
}

function runSegment(tier: WorldProgressionTier, zoneIndex: number, segmentIndex: number, weaponItemId: string): SegmentRun {
  const contract = getWorldProgressionZoneContract(tier, zoneIndex);
  const zoneDefId = zoneIdFor(tier, zoneIndex);
  const common = {
    weaponItemId,
    zoneDefId,
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId, contract.expected.gearTier),
    masteryLevel: contract.expected.masteryLevel,
    enchantment: contract.expected.enchantment,
  } as const;
  const noPotion = runCombatRuntimeBenchmark({ label: "world_progression_locator_no_potion", ...common, useHealthPotions: false });
  const withPotion = runCombatRuntimeBenchmark({ label: "world_progression_locator_potion", ...common, useHealthPotions: true });
  return {
    tier,
    zoneIndex,
    zoneDefId,
    zone: zoneName(String(zoneDefId)),
    segment: segmentIndex + 1,
    weapon: shortWeaponName(weaponItemId),
    gear: `T${String(contract.expected.gearTier)}.${String(contract.expected.enchantment)}`,
    mastery: contract.expected.masteryLevel,
    clearNoPotion: noPotion.clear,
    hpNoPotion: noPotion.hpPercent,
    clearPotion: withPotion.clear,
    hpPotion: withPotion.hpPercent,
    potionsUsed: withPotion.potionsUsed,
    telemetryNoPotion: noPotion.encounters,
    telemetryPotion: withPotion.encounters,
  };
}

function firstWallSegment(rows: readonly SegmentRun[], potion: boolean): number | null {
  return rows.find((row) => potion ? !row.clearPotion : !row.clearNoPotion)?.segment ?? null;
}

function lastClearSegment(rows: readonly SegmentRun[], potion: boolean): number | null {
  const cleared = rows.filter((row) => potion ? row.clearPotion : row.clearNoPotion);
  return cleared.length === 0 ? null : cleared[cleared.length - 1]?.segment ?? null;
}

function fmt(segment: number | null): string {
  return segment === null ? "-" : `S${String(segment)}`;
}

function nonMonotonicPairs(rows: readonly SegmentRun[], potion: boolean) {
  const pairs: Array<{ wall: SegmentRun; laterClear: SegmentRun; potion: boolean }> = [];
  const keys = new Map<string, SegmentRun[]>();
  for (const row of rows) {
    const key = `${String(row.tier)}|${String(row.zoneIndex)}|${row.weapon}`;
    const group = keys.get(key) ?? [];
    group.push(row);
    keys.set(key, group);
  }
  for (const group of keys.values()) {
    group.sort((a, b) => a.segment - b.segment);
    const firstWall = group.find((row) => potion ? !row.clearPotion : !row.clearNoPotion);
    if (firstWall === undefined) continue;
    const laterClear = group.filter((row) => row.segment > firstWall.segment && (potion ? row.clearPotion : row.clearNoPotion)).at(-1);
    if (laterClear !== undefined) pairs.push({ wall: firstWall, laterClear, potion });
  }
  return pairs;
}

function traceEncounterRows(row: SegmentRun, potion: boolean) {
  const telemetry = potion ? row.telemetryPotion : row.telemetryNoPotion;
  return telemetry.map((encounter) => {
    const monster = resolveMonsterForEncounter(row.zoneDefId, row.segment - 1, encounter.encounterIndex - 1);
    return {
      encounter: encounter.encounterIndex,
      monster: monster.name,
      damageType: monster.combat.damageType,
      cleared: encounter.cleared,
      hpBefore: encounter.hpBeforePercent,
      hpAfter: encounter.hpAfterPercent,
      damageReceived: encounter.damageReceived,
      damageDealt: encounter.damageDealt,
    };
  });
}

function printDetailedAnomalyTrace(rows: readonly SegmentRun[]): number {
  const anomalies = [...nonMonotonicPairs(rows, false), ...nonMonotonicPairs(rows, true)];
  console.log("[T4_T8_NON_MONOTONIC_RUNTIME_ANOMALIES]");
  console.table(anomalies.map(({ wall, laterClear, potion }) => ({
    tier: wall.tier,
    zone: wall.zone,
    weapon: wall.weapon,
    mode: potion ? "potion" : "no_potion",
    wall: `S${String(wall.segment)}`,
    laterClear: `S${String(laterClear.segment)}`,
  })));
  for (const { wall, laterClear, potion } of anomalies) {
    console.log(`[NON_MONOTONIC_TRACE] T${String(wall.tier)} | ${wall.zone} | ${wall.weapon} | ${potion ? "POTION" : "NO_POTION"}`);
    console.table(traceEncounterRows(wall, potion));
    console.table(traceEncounterRows(laterClear, potion));
  }
  return anomalies.length;
}

function buildLocator(rows: readonly SegmentRun[]) {
  return TARGET_TIERS.flatMap((tier) => getWorldProgressionTierContract(tier).zones.flatMap((zoneContract) => {
    const zone = zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex)));
    return weaponItemIds(zoneContract.expected.gearTier).map((weaponItemId) => {
      const weapon = shortWeaponName(weaponItemId);
      const weaponRows = rows.filter((row) => row.tier === tier && row.zoneIndex === zoneContract.zoneIndex && row.weapon === weapon);
      return {
        tier,
        role: zoneContract.role,
        zone,
        weapon,
        gear: `T${String(zoneContract.expected.gearTier)}.${String(zoneContract.expected.enchantment)}`,
        mastery: zoneContract.expected.masteryLevel,
        lastClearNoPotion: fmt(lastClearSegment(weaponRows, false)),
        firstWallNoPotion: fmt(firstWallSegment(weaponRows, false)),
        lastClearPotion: fmt(lastClearSegment(weaponRows, true)),
        firstWallPotion: fmt(firstWallSegment(weaponRows, true)),
      };
    });
  }));
}

interface ProgressionGateRow {
  readonly tier: WorldProgressionTier;
  readonly role: "progression";
  readonly zone: string;
  readonly expectedGear: string;
  readonly blockedGear: string;
  readonly weapon: string;
  readonly clearPotion: boolean;
  readonly hpPotion: number;
}

function previousProgressionLoadout(tier: WorldProgressionTier, enchantment: WorldProgressionEnchantment): { gearTier: Tier; enchantment: WorldProgressionEnchantment } {
  if (enchantment > 0) return { gearTier: tier, enchantment: (enchantment - 1) as WorldProgressionEnchantment };
  if (tier === 4) return { gearTier: 3, enchantment: 3 };
  return { gearTier: (tier - 1) as Tier, enchantment: 3 };
}

function buildProgressionGateRows(): readonly ProgressionGateRow[] {
  const rows: ProgressionGateRow[] = [];
  for (const tier of TARGET_TIERS) {
    for (const zoneContract of getWorldProgressionTierContract(tier).zones) {
      if (zoneContract.role !== "progression") continue;
      const zoneDefId = zoneIdFor(tier, zoneContract.zoneIndex);
      const blocked = previousProgressionLoadout(tier, zoneContract.expected.enchantment);
      for (const weaponItemId of weaponItemIds(blocked.gearTier)) {
        const result = runCombatRuntimeBenchmark({
          label: "world_progression_blocked_step",
          weaponItemId,
          zoneDefId,
          segmentIndex: FINAL_SEGMENT_INDEX,
          equipmentItemIds: equipmentFor(weaponItemId, blocked.gearTier),
          masteryLevel: zoneContract.expected.masteryLevel,
          enchantment: blocked.enchantment,
          useHealthPotions: true,
        });
        rows.push({
          tier,
          role: "progression",
          zone: zoneName(String(zoneDefId)),
          expectedGear: `T${String(zoneContract.expected.gearTier)}.${String(zoneContract.expected.enchantment)}`,
          blockedGear: `T${String(blocked.gearTier)}.${String(blocked.enchantment)}`,
          weapon: shortWeaponName(weaponItemId),
          clearPotion: result.clear,
          hpPotion: result.hpPercent,
        });
      }
    }
  }
  return rows;
}

interface PlateauContractRow {
  readonly tier: WorldProgressionTier;
  readonly role: "transition_plateau";
  readonly zone: string;
  readonly sourceGear: string;
  readonly weapon: string;
  readonly clearsS1ToS3Potion: boolean;
  readonly clearsS10Potion: boolean;
}

function buildPlateauRows(): readonly PlateauContractRow[] {
  const rows: PlateauContractRow[] = [];
  for (const tier of TARGET_TIERS) {
    const zoneContract = getWorldProgressionTierContract(tier).zones.find((zone) => zone.role === "transition_plateau");
    if (zoneContract === undefined || tier === 4) continue;
    const sourceTier = (tier - 1) as 4 | 5 | 6 | 7;
    const transition = getWorldTierTransitionContract(sourceTier);
    const zoneDefId = zoneIdFor(tier, zoneContract.zoneIndex);
    for (const weaponItemId of weaponItemIds(sourceTier)) {
      const clears: boolean[] = [];
      for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        clears.push(runCombatRuntimeBenchmark({
          label: "world_progression_plateau",
          weaponItemId,
          zoneDefId,
          segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
          masteryLevel: transition.masteryLevel,
          enchantment: transition.requiredEnchantment,
          useHealthPotions: true,
        }).clear);
      }
      rows.push({
        tier,
        role: "transition_plateau",
        zone: zoneName(String(zoneDefId)),
        sourceGear: `T${String(sourceTier)}.${String(transition.requiredEnchantment)}`,
        weapon: shortWeaponName(weaponItemId),
        clearsS1ToS3Potion: clears.slice(0, transition.plateauMinSegments).every(Boolean),
        clearsS10Potion: clears[transition.plateauMaxSegmentWithPotion] ?? false,
      });
    }
  }
  return rows;
}

interface FinalGateContractRow {
  readonly tier: 4 | 5 | 6 | 7;
  readonly role: "final_gate";
  readonly zone: string;
  readonly weapon: string;
  readonly blockedClear: boolean;
  readonly requiredClear: boolean;
}

function buildFinalGateRows(): readonly FinalGateContractRow[] {
  const rows: FinalGateContractRow[] = [];
  for (const tier of [4, 5, 6, 7] as const) {
    const transition = getWorldTierTransitionContract(tier);
    const zoneDefId = zoneIdFor(tier, transition.finalZoneIndex);
    for (const weaponItemId of weaponItemIds(tier)) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex: FINAL_SEGMENT_INDEX,
        equipmentItemIds: equipmentFor(weaponItemId, tier),
        masteryLevel: transition.masteryLevel,
        useHealthPotions: true,
      } as const;
      const blocked = runCombatRuntimeBenchmark({ label: "world_progression_final_blocked", ...common, enchantment: transition.blockedEnchantment });
      const required = runCombatRuntimeBenchmark({ label: "world_progression_final_required", ...common, enchantment: transition.requiredEnchantment });
      rows.push({
        tier,
        role: "final_gate",
        zone: zoneName(String(zoneDefId)),
        weapon: shortWeaponName(weaponItemId),
        blockedClear: blocked.clear,
        requiredClear: required.clear,
      });
    }
  }
  return rows;
}

function main(): void {
  const segmentRows: SegmentRun[] = [];
  for (const tier of TARGET_TIERS) {
    for (const zoneContract of getWorldProgressionTierContract(tier).zones) {
      for (const weaponItemId of weaponItemIds(zoneContract.expected.gearTier)) {
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          segmentRows.push(runSegment(tier, zoneContract.zoneIndex, segmentIndex, weaponItemId));
        }
      }
    }
  }

  const locator = buildLocator(segmentRows);
  const nonMonotonicAnomalies = printDetailedAnomalyTrace(segmentRows);
  const progressionRows = buildProgressionGateRows();
  const plateauRows = buildPlateauRows();
  const finalGateRows = buildFinalGateRows();

  const progressionLeaks = progressionRows.filter((row) => row.clearPotion);
  const plateauFailures = plateauRows.filter((row) => !row.clearsS1ToS3Potion || row.clearsS10Potion);
  const finalGateFailures = finalGateRows.filter((row) => row.blockedClear || !row.requiredClear);

  console.log("[WORLD_PROGRESSION_CONTRACT_REFERENCE]");
  console.log({ source: "@game/data WORLD_PROGRESSION_CONTRACT + WORLD_TIER_TRANSITION_CONTRACTS" });
  for (const tier of TARGET_TIERS) {
    console.log(`[T${String(tier)}_EXHAUSTIVE_WALL_LOCATOR]`);
    console.table(locator.filter((row) => row.tier === tier));
  }
  console.log("[WORLD_PROGRESSION_PROGRESSIVE_GATES]");
  console.table(progressionRows);
  console.log("[WORLD_PROGRESSION_PLATEAUS]");
  console.table(plateauRows);
  console.log("[WORLD_PROGRESSION_FINAL_GATES]");
  console.table(finalGateRows);
  console.log("[WORLD_PROGRESSION_CONTRACT_RESULT]", {
    nonMonotonicAnomalies,
    progressionLeaks: progressionLeaks.length,
    plateauFailures: plateauFailures.length,
    finalGateFailures: finalGateFailures.length,
    status: nonMonotonicAnomalies === 0 && progressionLeaks.length === 0 && plateauFailures.length === 0 && finalGateFailures.length === 0 ? "PASS" : "FAIL",
    rules: {
      transitionPlateau: "previous tier .3 + potion clears S1-S3 but not S10",
      progression: "the immediately previous authored gear step does not clear S10 with potion",
      finalGate: ".2 + potion fails; .3 + potion clears for all five weapons",
    },
  });
}

main();
