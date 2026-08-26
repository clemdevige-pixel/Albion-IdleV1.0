import fs from "node:fs";
import path from "node:path";

import { getWorldProgressionTierContract } from "@game/data";
import { getEncounterRewards } from "@game/gameplay";

import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  getWeaponFamilyDisplayName,
  getWeaponSpecializationName,
  resolveUnlockedWeaponAbilities,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
  resolveWeaponTier,
  WEAPON_ITEM_DEFINITIONS,
} from "../apps/client/src/data/weaponContentCatalog.js";
import {
  resolveWeaponBalanceProfileByMasteryId,
} from "../apps/client/src/data/weaponBalanceProfileCatalog.js";
import { getWeaponAbilityMechanics } from "../apps/client/src/data/weaponAbilityMechanics.js";
import {
  buildWeaponOnlyBenchmark,
  buildWeaponPackageBenchmark,
} from "../apps/client/src/data/weaponPackageBenchmark.js";
import {
  T4_DEFENSIVE_LOADOUT,
  T4_SHIELD,
} from "../apps/client/src/data/weaponIdealBenchmark.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../apps/client/src/data/worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
} from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const MASTERY_LEVEL = 30;
const ENCHANTMENT = 2 as const;
const USE_HEALTH_POTIONS = true;
const TARGET_TIERS = [4, 5, 6, 7, 8] as const;
const RUNTIME_CHECKPOINT_SEGMENTS = [1, 5, 10] as const;
type TargetTier = (typeof TARGET_TIERS)[number];
type WorldZoneDefId = Parameters<typeof getWorldZonePlacement>[0];

const T4_WEAPONS = Object.keys(WEAPON_ITEM_DEFINITIONS)
  .filter((itemId) => resolveWeaponTier(itemId) === 4)
  .sort((left, right) => {
    const leftFamily = resolveWeaponFamilyId(left) ?? "";
    const rightFamily = resolveWeaponFamilyId(right) ?? "";
    if (leftFamily !== rightFamily) return leftFamily.localeCompare(rightFamily);
    return (getWeaponSpecializationName(left) ?? left).localeCompare(getWeaponSpecializationName(right) ?? right);
  });

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;

interface SweepRow {
  readonly weapon: string;
  readonly family: string;
  readonly specialization: string;
  readonly itemId: string;
  readonly gameplay: string;
  readonly primaryRole: string;
  readonly secondaryRole: string;
  readonly profileStatus: "profiled" | "unprofiled";
  readonly zone: string;
  readonly segment: number;
  readonly clear: boolean;
  readonly seconds: number;
  readonly avgEncounterSeconds: number | null;
  readonly hpPercent: number;
  readonly potions: number;
  readonly encountersReached: number;
  readonly fameEarned: number;
  readonly famePerHour: number;
  readonly observedDps: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
}

interface IntrinsicScalingRow {
  readonly tier: TargetTier;
  readonly family: string;
  readonly weapon: string;
  readonly specializationMasteryId: string;
  readonly itemId: string;
  readonly sustainedDps: number;
  readonly opener5Dps: number;
  readonly opener10Dps: number;
  readonly packageScore: number;
  readonly sustainedVsFamilyPct: number;
  readonly packageVsFamilyPct: number;
}

interface RuntimeScalingRow {
  readonly tier: TargetTier;
  readonly family: string;
  readonly weapon: string;
  readonly specializationMasteryId: string;
  readonly itemId: string;
  readonly zone: string;
  readonly zoneStep: number;
  readonly zoneRole: string;
  readonly mastery: number;
  readonly segment: number;
  readonly clear: boolean;
  readonly seconds: number;
  readonly hpPercent: number;
  readonly potions: number;
  readonly observedDps: number;
}

function shortWeaponName(itemId: string): string {
  return getWeaponSpecializationName(itemId) ?? itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function familyName(itemId: string): string {
  const familyId = resolveWeaponFamilyId(itemId);
  return familyId === undefined ? "unknown" : (getWeaponFamilyDisplayName(familyId) ?? familyId);
}

function zoneName(zoneDefId: WorldZoneDefId): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
}

function armorForTier(tier: TargetTier): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentForTier(weaponItemId: string, tier: TargetTier): readonly string[] {
  const items = [...armorForTier(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function benchmarkLoadout(itemId: string) {
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds: T4_DEFENSIVE_LOADOUT, offHandItemId: T4_SHIELD }
    : { armorItemIds: T4_DEFENSIVE_LOADOUT };
}

function benchmarkLoadoutForTier(itemId: string, tier: TargetTier) {
  const armorItemIds = armorForTier(tier);
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds, offHandItemId: `item_shield_t${String(tier)}_reinforced` }
    : { armorItemIds };
}

function completedEncounters(clear: boolean, encountersReached: number): number {
  return clear ? 5 : Math.max(0, Math.min(4, encountersReached - 1));
}

function fameEarnedForRun(
  zoneDefId: WorldZoneDefId,
  segmentIndex: number,
  completed: number,
): number {
  const placement = getWorldZonePlacement(zoneDefId);
  let fame = 0;
  for (let encounterIndex = 0; encounterIndex < completed; encounterIndex += 1) {
    fame += getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    ).fame;
  }
  return fame;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentDelta(value: number, reference: number): number {
  if (reference === 0) return 0;
  return Number((((value / reference) - 1) * 100).toFixed(1));
}

function castsInsideWindow(cooldown: number, windowSeconds: number): number {
  const safeCooldown = Math.max(0.5, cooldown);
  return 1 + Math.floor(Math.max(0, windowSeconds - 1e-9) / safeCooldown);
}

function utilityDiagnostics(itemId: string): { hardControl30s: number; debuffUptime: number } {
  let hardControlSeconds = 0;
  let debuffSeconds = 0;

  for (const ability of resolveUnlockedWeaponAbilities(itemId, MASTERY_LEVEL)) {
    const casts = castsInsideWindow(ability.cooldown, 30);
    const mechanics = getWeaponAbilityMechanics(ability.id)?.mechanics ?? [];
    for (const mechanic of mechanics) {
      if (mechanic.kind !== "status") continue;
      if (mechanic.effectType === "stun" || mechanic.effectType === "silence") {
        hardControlSeconds += mechanic.duration * casts;
      } else if (mechanic.effectType === "debuff") {
        debuffSeconds += mechanic.duration * casts;
      }
    }
  }

  return {
    hardControl30s: Number(Math.min(30, hardControlSeconds).toFixed(2)),
    debuffUptime: Number(((Math.min(30, debuffSeconds) / 30) * 100).toFixed(1)),
  };
}

function profileFor(itemId: string) {
  const mastery = resolveWeaponMastery(itemId);
  if (mastery === undefined) throw new Error(`Missing mastery route for ${itemId}`);
  return resolveWeaponBalanceProfileByMasteryId(String(mastery.weaponId));
}

function specializationMasteryId(itemId: string): string {
  const mastery = resolveWeaponMastery(itemId);
  if (mastery === undefined) throw new Error(`Missing mastery route for ${itemId}`);
  return String(mastery.weaponId);
}

function weaponItemForTier(referenceItemId: string, tier: TargetTier): string {
  const specializationId = specializationMasteryId(referenceItemId);
  const itemId = Object.keys(WEAPON_ITEM_DEFINITIONS).find((candidate) =>
    resolveWeaponTier(candidate) === tier
    && specializationMasteryId(candidate) === specializationId,
  );
  if (itemId === undefined) {
    throw new Error(`Missing T${String(tier)} weapon item for ${specializationId}`);
  }
  return itemId;
}

function weaponItemsForTier(tier: TargetTier): readonly string[] {
  return T4_WEAPONS.map((referenceItemId) => weaponItemForTier(referenceItemId, tier));
}

function buildRows(): readonly SweepRow[] {
  const rows: SweepRow[] = [];

  for (const weaponItemId of T4_WEAPONS) {
    const profile = profileFor(weaponItemId);

    for (const zoneDefId of WORLD_ZONE_IDS_BY_BAND.blue) {
      for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
        const result = runCombatRuntimeBenchmark({
          label: `${String(zoneDefId)}_s${String(segmentIndex + 1)}`,
          weaponItemId,
          zoneDefId,
          segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId),
          enchantment: ENCHANTMENT,
          masteryLevel: MASTERY_LEVEL,
          useHealthPotions: USE_HEALTH_POTIONS,
        });
        const completed = completedEncounters(result.clear, result.encounterReached);
        const fameEarned = fameEarnedForRun(zoneDefId, segmentIndex, completed);
        const famePerHour = result.seconds > 0 ? Math.round((fameEarned / result.seconds) * 3600) : 0;

        rows.push({
          weapon: shortWeaponName(weaponItemId),
          family: familyName(weaponItemId),
          specialization: shortWeaponName(weaponItemId),
          itemId: weaponItemId,
          gameplay: profile?.gameplayProfile ?? "unprofiled",
          primaryRole: profile?.primaryContentRole ?? "unprofiled",
          secondaryRole: profile?.secondaryContentRole ?? "-",
          profileStatus: profile === undefined ? "unprofiled" : "profiled",
          zone: zoneName(zoneDefId),
          segment: segmentIndex + 1,
          clear: result.clear,
          seconds: result.seconds,
          avgEncounterSeconds: result.clear ? Number((result.seconds / 5).toFixed(2)) : null,
          hpPercent: result.hpPercent,
          potions: result.potionsUsed,
          encountersReached: result.encounterReached,
          fameEarned,
          famePerHour,
          observedDps: result.observedDps,
          damageDealt: result.damageDealt,
          damageReceived: result.damageReceived,
        });
      }
    }
  }

  return rows;
}

function buildIntrinsicScalingRows(): readonly IntrinsicScalingRow[] {
  const raw: Array<Omit<IntrinsicScalingRow, "sustainedVsFamilyPct" | "packageVsFamilyPct">> = [];

  for (const tier of TARGET_TIERS) {
    const itemIds = weaponItemsForTier(tier);
    const offenseRows = buildWeaponOnlyBenchmark(itemIds, MASTERY_LEVEL, ENCHANTMENT);
    const packageRows = buildWeaponPackageBenchmark(
      itemIds,
      MASTERY_LEVEL,
      ENCHANTMENT,
      (itemId) => benchmarkLoadoutForTier(itemId, tier),
    );
    const packageByItemId = new Map(packageRows.map((row) => [row.itemId, row] as const));

    for (const offense of offenseRows) {
      const packageRow = packageByItemId.get(offense.itemId);
      if (packageRow === undefined) throw new Error(`Missing scaling package benchmark for ${offense.itemId}`);
      raw.push({
        tier,
        family: familyName(offense.itemId),
        weapon: shortWeaponName(offense.itemId),
        specializationMasteryId: specializationMasteryId(offense.itemId),
        itemId: offense.itemId,
        sustainedDps: offense.sustainedDps,
        opener5Dps: offense.opener5,
        opener10Dps: offense.opener10,
        packageScore: packageRow.packageScore,
      });
    }
  }

  return raw.map((row) => {
    const familyTierRows = raw.filter((candidate) => candidate.tier === row.tier && candidate.family === row.family);
    return {
      ...row,
      sustainedVsFamilyPct: percentDelta(row.sustainedDps, median(familyTierRows.map((candidate) => candidate.sustainedDps))),
      packageVsFamilyPct: percentDelta(row.packageScore, median(familyTierRows.map((candidate) => candidate.packageScore))),
    };
  });
}

function buildRuntimeScalingRows(): readonly RuntimeScalingRow[] {
  const rows: RuntimeScalingRow[] = [];

  for (const tier of TARGET_TIERS) {
    const tierContract = getWorldProgressionTierContract(tier);
    const itemIds = weaponItemsForTier(tier);

    for (const zoneContract of tierContract.zones) {
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[tierContract.band][zoneContract.zoneIndex];
      if (zoneDefId === undefined) {
        throw new Error(`Missing zone ${String(zoneContract.zoneIndex + 1)} for T${String(tier)}`);
      }

      for (const weaponItemId of itemIds) {
        for (const segment of RUNTIME_CHECKPOINT_SEGMENTS) {
          const segmentIndex = segment - 1;
          const result = runCombatRuntimeBenchmark({
            label: `all_weapon_scaling_t${String(tier)}_${String(zoneDefId)}_s${String(segment)}`,
            weaponItemId,
            zoneDefId,
            segmentIndex,
            equipmentItemIds: equipmentForTier(weaponItemId, tier),
            enchantment: ENCHANTMENT,
            masteryLevel: zoneContract.expected.masteryLevel,
            useHealthPotions: true,
          });
          rows.push({
            tier,
            family: familyName(weaponItemId),
            weapon: shortWeaponName(weaponItemId),
            specializationMasteryId: specializationMasteryId(weaponItemId),
            itemId: weaponItemId,
            zone: zoneName(zoneDefId),
            zoneStep: zoneContract.zoneIndex + 1,
            zoneRole: zoneContract.role,
            mastery: zoneContract.expected.masteryLevel,
            segment,
            clear: result.clear,
            seconds: result.seconds,
            hpPercent: result.hpPercent,
            potions: result.potionsUsed,
            observedDps: result.observedDps,
          });
        }
      }
    }
  }

  return rows;
}

function main(): void {
  if (T4_WEAPONS.length === 0) throw new Error("No authored T4 weapons found for benchmark");

  const rows = buildRows();
  const representativeSegments = new Set([1, 5, 10]);
  const offenseRows = buildWeaponOnlyBenchmark(T4_WEAPONS, MASTERY_LEVEL, ENCHANTMENT);
  const packageRows = buildWeaponPackageBenchmark(T4_WEAPONS, MASTERY_LEVEL, ENCHANTMENT, benchmarkLoadout);
  const offenseByItemId = new Map(offenseRows.map((row) => [row.itemId, row] as const));
  const packageByItemId = new Map(packageRows.map((row) => [row.itemId, row] as const));

  console.log("[WEAPON_ROLE_WORLD_SWEEP_REFERENCE]", {
    masteryLevel: MASTERY_LEVEL,
    enchantment: ENCHANTMENT,
    fullT4Armor: true,
    healthPotions: USE_HEALTH_POTIONS,
    weaponCount: T4_WEAPONS.length,
    coverage: "all authored T4 weapon specializations",
    roleMetadata: "explicit profiles only; missing profiles are reported as unprofiled",
  });

  console.log("[WEAPON_ROLE_WORLD_SWEEP_CHECKPOINTS]");
  console.table(rows.filter((row) => representativeSegments.has(row.segment)).map((row) => ({
    family: row.family,
    weapon: row.weapon,
    role: row.primaryRole,
    zone: row.zone,
    segment: row.segment,
    clear: row.clear,
    seconds: row.seconds,
    hp: row.hpPercent,
    potions: row.potions,
    fameH: row.famePerHour,
    dps: row.observedDps,
  })));

  const summaries = T4_WEAPONS.map((weaponItemId) => {
    const weaponRows = rows.filter((row) => row.itemId === weaponItemId);
    const firstWall = weaponRows.find((row) => !row.clear);
    const cleared = weaponRows.filter((row) => row.clear);
    const deepest = cleared[cleared.length - 1];
    const bestFarm = [...cleared].sort((a, b) => b.famePerHour - a.famePerHour)[0];
    const bossBoundaries = cleared.filter((row) => row.segment === 10);
    const avgBossBoundarySeconds = bossBoundaries.length > 0
      ? Number((bossBoundaries.reduce((sum, row) => sum + row.seconds, 0) / bossBoundaries.length).toFixed(1))
      : null;
    const sample = weaponRows[0];
    const offense = offenseByItemId.get(weaponItemId);
    const packageRow = packageByItemId.get(weaponItemId);
    const utility = utilityDiagnostics(weaponItemId);

    if (offense === undefined) throw new Error(`Missing offense benchmark for ${weaponItemId}`);
    if (packageRow === undefined) throw new Error(`Missing package benchmark for ${weaponItemId}`);

    return {
      family: familyName(weaponItemId),
      weapon: shortWeaponName(weaponItemId),
      itemId: weaponItemId,
      role: sample?.primaryRole ?? "unprofiled",
      gameplay: sample?.gameplay ?? "unprofiled",
      profileStatus: sample?.profileStatus ?? "unprofiled",
      clears: cleared.length,
      deepestClear: deepest === undefined ? "none" : `${deepest.zone} S${String(deepest.segment)}`,
      firstWall: firstWall === undefined ? "none" : `${firstWall.zone} S${String(firstWall.segment)}`,
      bestFameH: bestFarm?.famePerHour ?? 0,
      bestFarmLocation: bestFarm === undefined ? "none" : `${bestFarm.zone} S${String(bestFarm.segment)}`,
      avgBossBoundarySeconds,
      sustainedDps: offense.sustainedDps,
      opener5Dps: offense.opener5,
      opener10Dps: offense.opener10,
      packageScore: packageRow.packageScore,
      hardControl30s: utility.hardControl30s,
      debuffUptime: utility.debuffUptime,
      totalPotionsOnClears: cleared.reduce((sum, row) => sum + row.potions, 0),
    };
  });

  const familyMedians = new Map<string, {
    sustainedDps: number;
    opener5Dps: number;
    opener10Dps: number;
    bestFameH: number;
    packageScore: number;
  }>();

  for (const family of new Set(summaries.map((row) => row.family))) {
    const familyRows = summaries.filter((row) => row.family === family);
    familyMedians.set(family, {
      sustainedDps: median(familyRows.map((row) => row.sustainedDps)),
      opener5Dps: median(familyRows.map((row) => row.opener5Dps)),
      opener10Dps: median(familyRows.map((row) => row.opener10Dps)),
      bestFameH: median(familyRows.map((row) => row.bestFameH)),
      packageScore: median(familyRows.map((row) => row.packageScore)),
    });
  }

  const comparative = summaries.map((row) => {
    const familyMedian = familyMedians.get(row.family);
    if (familyMedian === undefined) throw new Error(`Missing family median for ${row.family}`);
    return {
      family: row.family,
      weapon: row.weapon,
      role: row.role,
      profileStatus: row.profileStatus,
      sustained: row.sustainedDps,
      sustainedVsFamilyPct: percentDelta(row.sustainedDps, familyMedian.sustainedDps),
      opener5: row.opener5Dps,
      opener5VsFamilyPct: percentDelta(row.opener5Dps, familyMedian.opener5Dps),
      opener10: row.opener10Dps,
      opener10VsFamilyPct: percentDelta(row.opener10Dps, familyMedian.opener10Dps),
      bestFameH: row.bestFameH,
      fameVsFamilyPct: percentDelta(row.bestFameH, familyMedian.bestFameH),
      package: row.packageScore,
      packageVsFamilyPct: percentDelta(row.packageScore, familyMedian.packageScore),
      bossBoundarySec: row.avgBossBoundarySeconds,
      control30s: row.hardControl30s,
      debuffPct: row.debuffUptime,
    };
  });

  const familySummary = [...familyMedians.entries()].map(([family, values]) => ({
    family,
    weaponCount: summaries.filter((row) => row.family === family).length,
    unprofiledCount: summaries.filter((row) => row.family === family && row.profileStatus === "unprofiled").length,
    medianSustained: Number(values.sustainedDps.toFixed(1)),
    medianOpener5: Number(values.opener5Dps.toFixed(1)),
    medianOpener10: Number(values.opener10Dps.toFixed(1)),
    medianBestFameH: Math.round(values.bestFameH),
    medianPackage: Number(values.packageScore.toFixed(1)),
  }));

  console.log("[WEAPON_ROLE_WORLD_SWEEP_SUMMARY]");
  console.table(summaries);
  console.log("[ALL_WEAPONS_FAMILY_MEDIANS]");
  console.table(familySummary);
  console.log("[ALL_WEAPONS_RELATIVE_TO_FAMILY]");
  console.table(comparative);

  const intrinsicScalingRows = buildIntrinsicScalingRows();
  const intrinsicScalingSummary = T4_WEAPONS.map((referenceItemId) => {
    const specializationId = specializationMasteryId(referenceItemId);
    const weaponRows = intrinsicScalingRows.filter((row) => row.specializationMasteryId === specializationId);
    const t4 = weaponRows.find((row) => row.tier === 4);
    const t8 = weaponRows.find((row) => row.tier === 8);
    if (t4 === undefined || t8 === undefined) throw new Error(`Missing intrinsic endpoints for ${specializationId}`);
    return {
      family: t4.family,
      weapon: t4.weapon,
      t4Sustained: t4.sustainedDps,
      t5Sustained: weaponRows.find((row) => row.tier === 5)?.sustainedDps ?? 0,
      t6Sustained: weaponRows.find((row) => row.tier === 6)?.sustainedDps ?? 0,
      t7Sustained: weaponRows.find((row) => row.tier === 7)?.sustainedDps ?? 0,
      t8Sustained: t8.sustainedDps,
      t8VsT4Pct: percentDelta(t8.sustainedDps, t4.sustainedDps),
      t4VsFamilyPct: t4.sustainedVsFamilyPct,
      t8VsFamilyPct: t8.sustainedVsFamilyPct,
      relativeDriftPct: Number((t8.sustainedVsFamilyPct - t4.sustainedVsFamilyPct).toFixed(1)),
      t4Package: t4.packageScore,
      t8Package: t8.packageScore,
      packageDriftPct: Number((t8.packageVsFamilyPct - t4.packageVsFamilyPct).toFixed(1)),
    };
  });

  const intrinsicFamilyScaling = [...new Set(intrinsicScalingRows.map((row) => row.family))].map((family) => {
    const t4Rows = intrinsicScalingRows.filter((row) => row.family === family && row.tier === 4);
    const t8Rows = intrinsicScalingRows.filter((row) => row.family === family && row.tier === 8);
    const t4Median = median(t4Rows.map((row) => row.sustainedDps));
    const t8Median = median(t8Rows.map((row) => row.sustainedDps));
    return {
      family,
      t4MedianSustained: Number(t4Median.toFixed(1)),
      t8MedianSustained: Number(t8Median.toFixed(1)),
      t8VsT4Pct: percentDelta(t8Median, t4Median),
    };
  });

  console.log("[ALL_WEAPONS_INTRINSIC_T4_T8_SCALING]");
  console.table(intrinsicScalingSummary);
  console.log("[ALL_WEAPONS_FAMILY_T4_T8_SCALING]");
  console.table(intrinsicFamilyScaling);

  const runtimeScalingRows = buildRuntimeScalingRows();
  const runtimeScalingSummary = TARGET_TIERS.flatMap((tier) => T4_WEAPONS.map((referenceItemId) => {
    const specializationId = specializationMasteryId(referenceItemId);
    const tierRows = runtimeScalingRows.filter((row) => row.tier === tier && row.specializationMasteryId === specializationId);
    const finalStep = Math.max(...tierRows.map((row) => row.zoneStep));
    const finalGate = tierRows.find((row) => row.zoneStep === finalStep && row.segment === 10);
    const familyTierRows = runtimeScalingRows.filter((row) => row.tier === tier && row.family === familyName(referenceItemId));
    const familySpecializationIds = [...new Set(familyTierRows.map((row) => row.specializationMasteryId))];
    const familyWeaponAverages = familySpecializationIds.map((id) => average(familyTierRows.filter((row) => row.specializationMasteryId === id).map((row) => row.observedDps)));
    const avgObservedDps = average(tierRows.map((row) => row.observedDps));
    return {
      tier,
      family: familyName(referenceItemId),
      weapon: shortWeaponName(referenceItemId),
      checkpoints: tierRows.length,
      clears: tierRows.filter((row) => row.clear).length,
      clearRatePct: Number(((tierRows.filter((row) => row.clear).length / Math.max(1, tierRows.length)) * 100).toFixed(1)),
      avgObservedDps: Number(avgObservedDps.toFixed(1)),
      runtimeVsFamilyPct: percentDelta(avgObservedDps, median(familyWeaponAverages)),
      finalGateClear: finalGate?.clear ?? false,
      finalGateSeconds: finalGate?.seconds ?? null,
      finalGateHp: finalGate?.hpPercent ?? null,
      finalGateMastery: finalGate?.mastery ?? null,
    };
  }));

  const runtimeDriftSummary = T4_WEAPONS.map((referenceItemId) => {
    const weapon = shortWeaponName(referenceItemId);
    const family = familyName(referenceItemId);
    const t4 = runtimeScalingSummary.find((row) => row.tier === 4 && row.weapon === weapon && row.family === family);
    const t8 = runtimeScalingSummary.find((row) => row.tier === 8 && row.weapon === weapon && row.family === family);
    if (t4 === undefined || t8 === undefined) throw new Error(`Missing runtime scaling endpoints for ${weapon}`);
    return {
      family,
      weapon,
      t4AvgRuntimeDps: t4.avgObservedDps,
      t8AvgRuntimeDps: t8.avgObservedDps,
      t8VsT4Pct: percentDelta(t8.avgObservedDps, t4.avgObservedDps),
      t4VsFamilyPct: t4.runtimeVsFamilyPct,
      t8VsFamilyPct: t8.runtimeVsFamilyPct,
      relativeRuntimeDriftPct: Number((t8.runtimeVsFamilyPct - t4.runtimeVsFamilyPct).toFixed(1)),
      t4FinalGate: t4.finalGateClear,
      t8FinalGate: t8.finalGateClear,
    };
  });

  console.log("[ALL_WEAPONS_RUNTIME_TIER_CHECKPOINTS]");
  console.table(runtimeScalingSummary);
  console.log("[ALL_WEAPONS_RUNTIME_T4_T8_DRIFT]");
  console.table(runtimeDriftSummary);

  const outputDir = path.resolve(process.cwd(), "runtime-artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "weapon-role-world-sweep.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    reference: {
      masteryLevel: MASTERY_LEVEL,
      enchantment: ENCHANTMENT,
      fullT4Armor: true,
      healthPotions: USE_HEALTH_POTIONS,
      weaponCount: T4_WEAPONS.length,
      coverage: "all authored weapon specializations; T4 full world sweep plus T4-T8 intrinsic and progression-runtime scaling",
      roleMetadata: "explicit profiles only; missing profiles are reported as unprofiled",
      scaling: {
        intrinsic: "T4-T8 at fixed mastery 30 and enchantment .2",
        runtime: "T4-T8 progression-contract zones at authored mastery, enchantment .2, potion mode, segments S1/S5/S10",
      },
    },
    familySummary,
    comparative,
    summaries,
    rows,
    intrinsicScalingRows,
    intrinsicScalingSummary,
    intrinsicFamilyScaling,
    runtimeScalingRows,
    runtimeScalingSummary,
    runtimeDriftSummary,
  }, null, 2));
  console.log(`[WEAPON_ROLE_WORLD_SWEEP_JSON] ${outputPath}`);
}

main();