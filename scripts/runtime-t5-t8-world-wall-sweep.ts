import {
  WORLD_ENCHANTMENT_PROGRESSION_CONTRACT,
  getWorldProgressionTierContract,
  getWorldTierTransitionContract,
  type WorldProgressionEnchantment,
  type WorldProgressionSourceTier,
  type WorldProgressionTier,
  type WorldProgressionZoneRole,
} from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 3 | WorldProgressionTier;

type Loadout = {
  readonly gearTier: Tier;
  readonly enchantment: WorldProgressionEnchantment;
};

interface SegmentRun {
  readonly tier: WorldProgressionTier;
  readonly bandStep: number;
  readonly zoneIndex: number;
  readonly role: WorldProgressionZoneRole;
  readonly zone: string;
  readonly weapon: string;
  readonly gear: string;
  readonly mastery: number;
  readonly segment: number;
  readonly clearNoPotion: boolean;
  readonly clearPotion: boolean;
}

const TARGET_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly WorldProgressionTier[];
const SOURCE_TIERS = [4, 5, 6, 7] as const satisfies readonly WorldProgressionSourceTier[];
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
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: Tier): readonly string[] {
  if (tier === 3) {
    return ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"];
  }
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function zoneIdFor(tier: WorldProgressionTier, zoneIndex: number) {
  const { band } = getWorldProgressionTierContract(tier);
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneDefId === undefined) {
    throw new Error(`Missing zone ${String(zoneIndex + 1)} for T${String(tier)}`);
  }
  return zoneDefId;
}

function loadoutLabel(loadout: Loadout): string {
  return `T${String(loadout.gearTier)}.${String(loadout.enchantment)}`;
}

function previousProgressionLoadout(
  tier: WorldProgressionTier,
  enchantment: WorldProgressionEnchantment,
): Loadout {
  if (enchantment > 0) {
    return {
      gearTier: tier,
      enchantment: (enchantment - 1) as WorldProgressionEnchantment,
    };
  }
  if (tier === 4) return { gearTier: 3, enchantment: 3 };
  return { gearTier: (tier - 1) as Tier, enchantment: 3 };
}

function runLoadoutAcrossZone(
  tier: WorldProgressionTier,
  zoneIndex: number,
  role: WorldProgressionZoneRole,
  loadout: Loadout,
  masteryLevel: number,
  label: string,
): readonly SegmentRun[] {
  const zoneDefId = zoneIdFor(tier, zoneIndex);
  const rows: SegmentRun[] = [];

  for (const weaponItemId of weaponItemIds(loadout.gearTier)) {
    for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, loadout.gearTier),
        masteryLevel,
        enchantment: loadout.enchantment,
      } as const;
      const noPotion = runCombatRuntimeBenchmark({
        label: `${label}_no_potion`,
        ...common,
        useHealthPotions: false,
      });
      const withPotion = runCombatRuntimeBenchmark({
        label: `${label}_potion`,
        ...common,
        useHealthPotions: true,
      });
      rows.push({
        tier,
        bandStep: zoneIndex + 1,
        zoneIndex,
        role,
        zone: zoneName(String(zoneDefId)),
        weapon: shortWeaponName(weaponItemId),
        gear: loadoutLabel(loadout),
        mastery: masteryLevel,
        segment: segmentIndex + 1,
        clearNoPotion: noPotion.clear,
        clearPotion: withPotion.clear,
      });
    }
  }

  return rows;
}

function lastClearSegment(rows: readonly SegmentRun[], potion: boolean): number {
  const cleared = rows.filter((row) => potion ? row.clearPotion : row.clearNoPotion);
  return cleared.at(-1)?.segment ?? 0;
}

function firstWallSegment(rows: readonly SegmentRun[], potion: boolean): number | null {
  return rows.find((row) => potion ? !row.clearPotion : !row.clearNoPotion)?.segment ?? null;
}

function hasWallThenLaterClear(rows: readonly SegmentRun[], potion: boolean): boolean {
  const wall = firstWallSegment(rows, potion);
  if (wall === null) return false;
  return rows.some((row) => row.segment > wall && (potion ? row.clearPotion : row.clearNoPotion));
}

function fmt(segment: number): string {
  return segment <= 0 ? "-" : `S${String(segment)}`;
}

function buildExpectedRows(): readonly SegmentRun[] {
  const rows: SegmentRun[] = [];
  for (const tier of TARGET_TIERS) {
    for (const zoneContract of getWorldProgressionTierContract(tier).zones) {
      rows.push(...runLoadoutAcrossZone(
        tier,
        zoneContract.zoneIndex,
        zoneContract.role,
        zoneContract.expected,
        zoneContract.expected.masteryLevel,
        "world_progression_expected",
      ));
    }
  }
  return rows;
}

function buildLocator(rows: readonly SegmentRun[]) {
  return TARGET_TIERS.flatMap((tier) =>
    getWorldProgressionTierContract(tier).zones.flatMap((zoneContract) => {
      const zoneRows = rows.filter((row) => row.tier === tier && row.zoneIndex === zoneContract.zoneIndex);
      return WEAPON_FAMILIES.map(([family, specialization]) => {
        const weapon = `${family} ${specialization}`;
        const weaponRows = zoneRows.filter((row) => row.weapon === weapon);
        return {
          tier,
          bandStep: zoneContract.zoneIndex + 1,
          role: zoneContract.role,
          zone: weaponRows[0]?.zone ?? zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex))),
          weapon,
          gear: `T${String(zoneContract.expected.gearTier)}.${String(zoneContract.expected.enchantment)}`,
          mastery: zoneContract.expected.masteryLevel,
          lastClearAfk: fmt(lastClearSegment(weaponRows, false)),
          firstWallAfk: firstWallSegment(weaponRows, false) === null ? "-" : `S${String(firstWallSegment(weaponRows, false))}`,
          lastClearPotion: fmt(lastClearSegment(weaponRows, true)),
          firstWallPotion: firstWallSegment(weaponRows, true) === null ? "-" : `S${String(firstWallSegment(weaponRows, true))}`,
        };
      });
    }),
  );
}

interface EnchantmentProgressionRow {
  readonly tier: WorldProgressionTier;
  readonly bandStep: number;
  readonly zone: string;
  readonly expectedGear: string;
  readonly previousGear: string;
  readonly weapon: string;
  readonly previousAfkLastClear: number;
  readonly previousPotionLastClear: number;
  readonly potionPushGain: number;
  readonly expectedAfkLastClear: number;
  readonly afkUpgradeGain: number;
  readonly previousAfkWallExists: boolean;
  readonly afkUpgradeMarked: boolean;
  readonly monotonic: boolean;
  readonly status: "PASS" | "FAIL";
}

function buildEnchantmentProgressionRows(expectedRows: readonly SegmentRun[]): readonly EnchantmentProgressionRow[] {
  const rows: EnchantmentProgressionRow[] = [];

  for (const tier of TARGET_TIERS) {
    for (const zoneContract of getWorldProgressionTierContract(tier).zones) {
      if (zoneContract.role !== "progression") continue;

      const previous = previousProgressionLoadout(tier, zoneContract.expected.enchantment);
      const previousRows = runLoadoutAcrossZone(
        tier,
        zoneContract.zoneIndex,
        zoneContract.role,
        previous,
        zoneContract.expected.masteryLevel,
        "world_progression_previous_step",
      );
      const zoneExpectedRows = expectedRows.filter(
        (row) => row.tier === tier && row.zoneIndex === zoneContract.zoneIndex,
      );

      for (const [family, specialization] of WEAPON_FAMILIES) {
        const weapon = `${family} ${specialization}`;
        const previousWeaponRows = previousRows.filter((row) => row.weapon === weapon);
        const expectedWeaponRows = zoneExpectedRows.filter((row) => row.weapon === weapon);
        const previousAfkLastClear = lastClearSegment(previousWeaponRows, false);
        const previousPotionLastClear = lastClearSegment(previousWeaponRows, true);
        const potionPushGain = previousPotionLastClear - previousAfkLastClear;
        const expectedAfkLastClear = lastClearSegment(expectedWeaponRows, false);
        const afkUpgradeGain = expectedAfkLastClear - previousAfkLastClear;
        const previousAfkWallExists = previousAfkLastClear < SEGMENTS_PER_ZONE;
        const afkUpgradeMarked = afkUpgradeGain >= WORLD_ENCHANTMENT_PROGRESSION_CONTRACT.minAfkUpgradeGainSegments;
        const monotonic = !hasWallThenLaterClear(previousWeaponRows, false)
          && !hasWallThenLaterClear(expectedWeaponRows, false);
        const status = afkUpgradeMarked ? "PASS" : "FAIL";

        rows.push({
          tier,
          bandStep: zoneContract.zoneIndex + 1,
          zone: zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex))),
          expectedGear: `T${String(zoneContract.expected.gearTier)}.${String(zoneContract.expected.enchantment)}`,
          previousGear: loadoutLabel(previous),
          weapon,
          previousAfkLastClear,
          previousPotionLastClear,
          potionPushGain,
          expectedAfkLastClear,
          afkUpgradeGain,
          previousAfkWallExists,
          afkUpgradeMarked,
          monotonic,
          status,
        });
      }
    }
  }

  return rows;
}

interface PlateauRow {
  readonly transition: string;
  readonly tier: WorldProgressionTier;
  readonly bandStep: number;
  readonly zone: string;
  readonly sourceGear: string;
  readonly weapon: string;
  readonly afkLastClear: number;
  readonly potionLastClear: number;
  readonly clearsRequiredAfkPlateau: boolean;
  readonly clearsForbiddenLateSegmentWithPotion: boolean;
  readonly monotonic: boolean;
  readonly status: "PASS" | "FAIL";
}

function buildPlateauRows(): readonly PlateauRow[] {
  const rows: PlateauRow[] = [];

  for (const sourceTier of SOURCE_TIERS) {
    const transition = getWorldTierTransitionContract(sourceTier);
    const nextTier = (sourceTier + 1) as WorldProgressionTier;
    const nextZone = getWorldProgressionTierContract(nextTier).zones.find(
      (zone) => zone.zoneIndex === transition.nextTierFirstZoneIndex,
    );
    if (nextZone === undefined || nextZone.role !== "transition_plateau") {
      throw new Error(`Missing transition plateau for T${String(sourceTier)}→T${String(nextTier)}`);
    }

    const plateauRows = runLoadoutAcrossZone(
      nextTier,
      nextZone.zoneIndex,
      nextZone.role,
      { gearTier: sourceTier, enchantment: transition.requiredEnchantment },
      transition.masteryLevel,
      "world_progression_transition_plateau",
    );

    for (const [family, specialization] of WEAPON_FAMILIES) {
      const weapon = `${family} ${specialization}`;
      const weaponRows = plateauRows.filter((row) => row.weapon === weapon);
      const clearsRequiredAfkPlateau = weaponRows
        .filter((row) => row.segment <= transition.plateauMinSegments)
        .every((row) => row.clearNoPotion);
      const lateRow = weaponRows.find(
        (row) => row.segment === transition.plateauMaxSegmentWithPotion + 1,
      );
      const clearsForbiddenLateSegmentWithPotion = lateRow?.clearPotion ?? false;
      const monotonic = !hasWallThenLaterClear(weaponRows, false)
        && !hasWallThenLaterClear(weaponRows, true);
      const status = clearsRequiredAfkPlateau && !clearsForbiddenLateSegmentWithPotion && monotonic
        ? "PASS"
        : "FAIL";

      rows.push({
        transition: `T${String(sourceTier)}→T${String(nextTier)}`,
        tier: nextTier,
        bandStep: nextZone.zoneIndex + 1,
        zone: zoneName(String(zoneIdFor(nextTier, nextZone.zoneIndex))),
        sourceGear: `T${String(sourceTier)}.${String(transition.requiredEnchantment)}`,
        weapon,
        afkLastClear: lastClearSegment(weaponRows, false),
        potionLastClear: lastClearSegment(weaponRows, true),
        clearsRequiredAfkPlateau,
        clearsForbiddenLateSegmentWithPotion,
        monotonic,
        status,
      });
    }
  }

  return rows;
}

interface FinalGateRow {
  readonly transition: string;
  readonly tier: WorldProgressionSourceTier;
  readonly bandStep: number;
  readonly zone: string;
  readonly weapon: string;
  readonly blockedPotionClear: boolean;
  readonly requiredNoPotionClear: boolean;
  readonly requiredPotionClear: boolean;
  readonly status: "PASS" | "FAIL";
}

function buildFinalGateRows(): readonly FinalGateRow[] {
  const rows: FinalGateRow[] = [];

  for (const sourceTier of SOURCE_TIERS) {
    const transition = getWorldTierTransitionContract(sourceTier);
    const zoneDefId = zoneIdFor(sourceTier, transition.finalZoneIndex);

    for (const weaponItemId of weaponItemIds(sourceTier)) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex: FINAL_SEGMENT_INDEX,
        equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
        masteryLevel: transition.masteryLevel,
      } as const;
      const blockedPotion = runCombatRuntimeBenchmark({
        label: "world_progression_final_blocked_potion",
        ...common,
        enchantment: transition.blockedEnchantment,
        useHealthPotions: true,
      });
      const requiredNoPotion = runCombatRuntimeBenchmark({
        label: "world_progression_final_required_no_potion",
        ...common,
        enchantment: transition.requiredEnchantment,
        useHealthPotions: false,
      });
      const requiredPotion = runCombatRuntimeBenchmark({
        label: "world_progression_final_required_potion",
        ...common,
        enchantment: transition.requiredEnchantment,
        useHealthPotions: true,
      });
      rows.push({
        transition: `T${String(sourceTier)}→T${String(sourceTier + 1)}`,
        tier: sourceTier,
        bandStep: transition.finalZoneIndex + 1,
        zone: zoneName(String(zoneDefId)),
        weapon: shortWeaponName(weaponItemId),
        blockedPotionClear: blockedPotion.clear,
        requiredNoPotionClear: requiredNoPotion.clear,
        requiredPotionClear: requiredPotion.clear,
        status: !blockedPotion.clear && !requiredNoPotion.clear && requiredPotion.clear ? "PASS" : "FAIL",
      });
    }
  }

  return rows;
}

function expectedNonMonotonicRows(rows: readonly SegmentRun[]) {
  return TARGET_TIERS.flatMap((tier) =>
    getWorldProgressionTierContract(tier).zones.flatMap((zoneContract) =>
      WEAPON_FAMILIES.flatMap(([family, specialization]) => {
        const weapon = `${family} ${specialization}`;
        const weaponRows = rows.filter(
          (row) => row.tier === tier && row.zoneIndex === zoneContract.zoneIndex && row.weapon === weapon,
        );
        const anomalies: Array<Record<string, string | number>> = [];
        if (hasWallThenLaterClear(weaponRows, false)) {
          anomalies.push({ tier, bandStep: zoneContract.zoneIndex + 1, zone: weaponRows[0]?.zone ?? "-", weapon, mode: "AFK" });
        }
        if (hasWallThenLaterClear(weaponRows, true)) {
          anomalies.push({ tier, bandStep: zoneContract.zoneIndex + 1, zone: weaponRows[0]?.zone ?? "-", weapon, mode: "POTION" });
        }
        return anomalies;
      }),
    ),
  );
}

function main(): void {
  const expectedRows = buildExpectedRows();
  const locator = buildLocator(expectedRows);
  const enchantmentRows = buildEnchantmentProgressionRows(expectedRows);
  const plateauRows = buildPlateauRows();
  const finalGateRows = buildFinalGateRows();
  const expectedNonMonotonic = expectedNonMonotonicRows(expectedRows);

  const enchantmentFailures = enchantmentRows.filter((row) => row.status === "FAIL");
  const plateauDiagnostics = plateauRows.filter((row) => row.status === "FAIL");
  const finalGateFailures = finalGateRows.filter((row) => row.status === "FAIL");

  console.log("[WORLD_PROGRESSION_CONTRACT_REFERENCE]");
  console.log({
    source: "@game/data WORLD_PROGRESSION_CONTRACT + WORLD_ENCHANTMENT_PROGRESSION_CONTRACT + WORLD_TIER_TRANSITION_CONTRACTS",
    enchantmentProgression: WORLD_ENCHANTMENT_PROGRESSION_CONTRACT,
    potion: "telemetry only outside final gates",
  });

  for (const tier of TARGET_TIERS) {
    console.log(`[T${String(tier)}_EXHAUSTIVE_WALL_LOCATOR]`);
    console.table(locator.filter((row) => row.tier === tier));
  }

  console.log("[WORLD_ENCHANTMENT_PROGRESSION]");
  console.table(enchantmentRows.map((row) => ({
    tier: row.tier,
    bandStep: row.bandStep,
    zone: row.zone,
    expectedGear: row.expectedGear,
    previousGear: row.previousGear,
    weapon: row.weapon,
    previousAfk: fmt(row.previousAfkLastClear),
    expectedAfk: fmt(row.expectedAfkLastClear),
    upgradeGain: row.afkUpgradeGain,
    previousPotion: fmt(row.previousPotionLastClear),
    potionGainTelemetry: row.potionPushGain,
    status: row.status,
  })));

  console.log("[WORLD_ENCHANTMENT_PROGRESSION_FAILURES]");
  console.table(enchantmentFailures);

  console.log("[WORLD_PROGRESSION_FINAL_GATES]");
  console.table(finalGateRows);

  console.log("[WORLD_PROGRESSION_PLATEAU_DIAGNOSTICS]");
  console.table(plateauRows);

  console.log("[WORLD_PROGRESSION_NON_MONOTONIC_DIAGNOSTICS]");
  console.table(expectedNonMonotonic);

  const status = enchantmentFailures.length === 0 && finalGateFailures.length === 0
    ? "PASS"
    : "FAIL";

  console.log("[WORLD_PROGRESSION_CONTRACT_RESULT]", {
    enchantmentFailures: enchantmentFailures.length,
    finalGateFailures: finalGateFailures.length,
    plateauDiagnostics: plateauDiagnostics.length,
    nonMonotonicDiagnostics: expectedNonMonotonic.length,
    status,
    blockingRules: {
      enchantmentStep: `authored gear step moves the AFK wall by at least ${String(WORLD_ENCHANTMENT_PROGRESSION_CONTRACT.minAfkUpgradeGainSegments)} segment`,
      finalGate: ".2 + potion fails; .3 without potion fails; .3 + potion clears for all five weapons",
    },
    telemetryOnly: {
      potion: "active-push distance is measured but does not fail normal progression zones",
      plateau: "transition plateau remains reported and is enforced by benchmark:tier-transitions",
      monotonicity: "wall-then-later-clear anomalies are reported separately for diagnosis",
      endgame: "Blackspire remains diagnostic until a dedicated T8 endgame target is authored",
    },
  });
}

main();
