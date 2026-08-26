import fs from "node:fs";
import path from "node:path";

import { getEncounterRewards } from "@game/gameplay";

import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  getWeaponFamilyDisplayName,
  getWeaponSpecializationName,
  resolveWeaponFamilyId,
  resolveWeaponMastery,
  resolveWeaponTier,
  WEAPON_ITEM_DEFINITIONS,
} from "../apps/client/src/data/weaponContentCatalog.js";
import {
  resolveWeaponBalanceProfileByMasteryId,
} from "../apps/client/src/data/weaponBalanceProfileCatalog.js";
import {
  buildWeaponRoleBenchmark,
} from "../apps/client/src/data/weaponRoleBenchmark.js";
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
const T4_SHIELD = "item_shield_t4_reinforced";

interface SweepRow {
  readonly weapon: string;
  readonly family: string;
  readonly specialization: string;
  readonly itemId: string;
  readonly gameplay: string;
  readonly primaryRole: string;
  readonly secondaryRole: string;
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

function shortWeaponName(itemId: string): string {
  return getWeaponSpecializationName(itemId) ?? itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function familyName(itemId: string): string {
  const familyId = resolveWeaponFamilyId(itemId);
  return familyId === undefined ? "unknown" : (getWeaponFamilyDisplayName(familyId) ?? familyId);
}

function zoneName(zoneDefId: (typeof WORLD_ZONE_IDS_BY_BAND.blue)[number]): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
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

function completedEncounters(clear: boolean, encountersReached: number): number {
  return clear ? 5 : Math.max(0, Math.min(4, encountersReached - 1));
}

function fameEarnedForRun(
  zoneDefId: (typeof WORLD_ZONE_IDS_BY_BAND.blue)[number],
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

function percentDelta(value: number, reference: number): number {
  if (reference === 0) return 0;
  return Number((((value / reference) - 1) * 100).toFixed(1));
}

function buildRows(): readonly SweepRow[] {
  const rows: SweepRow[] = [];

  for (const weaponItemId of T4_WEAPONS) {
    const mastery = resolveWeaponMastery(weaponItemId);
    if (mastery === undefined) throw new Error(`Missing mastery route for ${weaponItemId}`);
    const profile = resolveWeaponBalanceProfileByMasteryId(String(mastery.weaponId));
    if (profile === undefined) throw new Error(`Missing balance profile for ${weaponItemId}`);

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
          gameplay: profile.gameplayProfile,
          primaryRole: profile.primaryContentRole,
          secondaryRole: profile.secondaryContentRole ?? "-",
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

function main(): void {
  if (T4_WEAPONS.length === 0) throw new Error("No authored T4 weapons found for benchmark");

  const rows = buildRows();
  const representativeSegments = new Set([1, 5, 10]);
  const diagnostics = buildWeaponRoleBenchmark(T4_WEAPONS, MASTERY_LEVEL, ENCHANTMENT, benchmarkLoadout);
  const diagnosticByItemId = new Map(diagnostics.map((row) => [row.itemId, row] as const));

  console.log("[WEAPON_ROLE_WORLD_SWEEP_REFERENCE]", {
    masteryLevel: MASTERY_LEVEL,
    enchantment: ENCHANTMENT,
    fullT4Armor: true,
    healthPotions: USE_HEALTH_POTIONS,
    weaponCount: T4_WEAPONS.length,
    coverage: "all authored T4 weapon specializations",
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
    const diagnostic = diagnosticByItemId.get(weaponItemId);

    return {
      family: familyName(weaponItemId),
      weapon: shortWeaponName(weaponItemId),
      itemId: weaponItemId,
      role: sample?.primaryRole ?? "-",
      gameplay: sample?.gameplay ?? "-",
      clears: cleared.length,
      deepestClear: deepest === undefined ? "none" : `${deepest.zone} S${String(deepest.segment)}`,
      firstWall: firstWall === undefined ? "none" : `${firstWall.zone} S${String(firstWall.segment)}`,
      bestFameH: bestFarm?.famePerHour ?? 0,
      bestFarmLocation: bestFarm === undefined ? "none" : `${bestFarm.zone} S${String(bestFarm.segment)}`,
      avgBossBoundarySeconds,
      sustainedDps: diagnostic?.sustainedDps ?? 0,
      opener5Dps: diagnostic?.opener5Dps ?? 0,
      opener10Dps: diagnostic?.opener10Dps ?? 0,
      packageScore: diagnostic?.packageScore ?? 0,
      hardControl30s: diagnostic?.hardControlSecondsPer30s ?? 0,
      debuffUptime: diagnostic?.debuffUptimePercent ?? 0,
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
      coverage: "all authored T4 weapon specializations",
    },
    familySummary,
    comparative,
    summaries,
    rows,
  }, null, 2));
  console.log(`[WEAPON_ROLE_WORLD_SWEEP_JSON] ${outputPath}`);
}

main();
