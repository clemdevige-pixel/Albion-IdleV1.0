import { getWorldProgressionTierContract, type WorldProgressionTier } from "@game/data";
import { getEncounterRewards } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";
import { getWorldZonePlacement } from "../apps/client/src/data/worldContentCatalog.js";
import {
  TARGET_TIERS,
  WEAPON_FAMILIES,
  equipmentFor,
  shortWeaponName,
  weaponItemIds,
  zoneIdFor,
  zoneName,
} from "./lib/world-progression-benchmark.js";

const AUDITED_GEAR_TIERS = [5, 6, 7, 8] as const satisfies readonly WorldProgressionTier[];
const ENCHANTMENT = 3 as const;
const SEGMENTS_PER_ZONE = 10;
const ENCOUNTERS_PER_SEGMENT = 5;

type Mode = "afk" | "potion";

interface FarmRow {
  readonly gearTier: WorldProgressionTier;
  readonly targetTier: WorldProgressionTier;
  readonly zone: string;
  readonly segment: number;
  readonly weapon: string;
  readonly mode: Mode;
  readonly mastery: number;
  readonly seconds: number;
  readonly famePerHour: number;
}

function lateTierMastery(tier: WorldProgressionTier): number {
  const last = getWorldProgressionTierContract(tier).zones.at(-1);
  if (last === undefined) throw new Error(`Missing world progression contract for T${String(tier)}`);
  return last.expected.masteryLevel;
}

function famePerSegment(
  targetTier: WorldProgressionTier,
  zoneIndex: number,
  segmentIndex: number,
): number {
  const zoneDefId = zoneIdFor(targetTier, zoneIndex);
  const placement = getWorldZonePlacement(zoneDefId);
  let fame = 0;
  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    fame += getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    ).fame;
  }
  return fame;
}

function toRate(quantityPerSegment: number, seconds: number): number {
  return seconds > 0 ? quantityPerSegment / (seconds / 3600) : 0;
}

function bestFame(rows: readonly FarmRow[]): FarmRow | undefined {
  return rows.reduce<FarmRow | undefined>((best, row) => {
    if (best === undefined || row.famePerHour > best.famePerHour) return row;
    return best;
  }, undefined);
}

const rows: FarmRow[] = [];

for (const gearTier of AUDITED_GEAR_TIERS) {
  const mastery = lateTierMastery(gearTier);
  for (const targetTier of TARGET_TIERS.filter((tier) => tier <= gearTier)) {
    const contract = getWorldProgressionTierContract(targetTier);
    for (const zoneContract of contract.zones) {
      const zoneDefId = zoneIdFor(targetTier, zoneContract.zoneIndex);
      const zone = zoneName(String(zoneDefId));
      for (const weaponItemId of weaponItemIds(gearTier)) {
        const weapon = shortWeaponName(weaponItemId);
        const equipmentItemIds = equipmentFor(weaponItemId, gearTier);
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          const fame = famePerSegment(targetTier, zoneContract.zoneIndex, segmentIndex);
          for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
            const result = runCombatRuntimeBenchmark({
              label: `cross_tier_fame_t${String(gearTier)}_into_t${String(targetTier)}_${mode}`,
              weaponItemId,
              zoneDefId,
              segmentIndex,
              equipmentItemIds,
              masteryLevel: mastery,
              enchantment: ENCHANTMENT,
              useHealthPotions: mode === "potion",
            });
            if (!result.clear || result.seconds <= 0) continue;
            rows.push({
              gearTier,
              targetTier,
              zone,
              segment: segmentIndex + 1,
              weapon,
              mode,
              mastery,
              seconds: result.seconds,
              famePerHour: toRate(fame, result.seconds),
            });
          }
        }
      }
    }
  }
}

const riskRows = AUDITED_GEAR_TIERS.flatMap((gearTier) => {
  const mastery = lateTierMastery(gearTier);
  return WEAPON_FAMILIES.flatMap(([family, specialization]) => {
    const weapon = `${family} ${specialization}`;
    return (["afk", "potion"] as const satisfies readonly Mode[]).flatMap((mode) => {
      const current = bestFame(rows.filter((row) => (
        row.gearTier === gearTier
        && row.targetTier === gearTier
        && row.weapon === weapon
        && row.mode === mode
      )));
      const legacy = bestFame(rows.filter((row) => (
        row.gearTier === gearTier
        && row.targetTier < gearTier
        && row.weapon === weapon
        && row.mode === mode
      )));
      if (current === undefined) return [];
      const ratio = legacy === undefined || current.famePerHour <= 0
        ? 0
        : legacy.famePerHour / current.famePerHour;
      return [{
        gear: `T${String(gearTier)}.${String(ENCHANTMENT)}`,
        weapon,
        mode,
        mastery,
        currentFameH: Number(current.famePerHour.toFixed(0)),
        currentFarm: `${current.zone} S${String(current.segment)}`,
        bestLegacyFameH: Number((legacy?.famePerHour ?? 0).toFixed(0)),
        legacyFarm: legacy === undefined ? "-" : `${legacy.zone} S${String(legacy.segment)}`,
        legacyTier: legacy === undefined ? "-" : `T${String(legacy.targetTier)}`,
        legacyFameVsCurrent: `${(ratio * 100).toFixed(1)}%`,
      }];
    });
  });
});

const regressions = riskRows.filter((row) => Number.parseFloat(row.legacyFameVsCurrent) >= 100);

console.log("[CROSS_TIER_WORLD_FAME_AUDIT_CONTRACT]", {
  gear: "T5.3-T8.3 full same-tier packages",
  targetZones: "all already-unlocked T4-T8 world progression zones at or below gear tier",
  mastery: "final authored expected World mastery of the equipped gear tier",
  weapons: WEAPON_FAMILIES.length,
  modes: ["afk", "potion"],
  rewards: "Fame uses live getEncounterRewards; TTK uses live CombatRuntimeBenchmarkHarness",
  purpose: "detect whether overgearing makes a lower-tier World band outperform the current-tier band for Fame/h",
});
console.log("[CROSS_TIER_WORLD_FAME_RISK_SUMMARY]");
console.table(riskRows);
console.log("[CROSS_TIER_WORLD_FAME_REGRESSIONS]", {
  legacyBeatsOrEqualsCurrent: regressions.length,
  totalProfiles: riskRows.length,
});
if (regressions.length > 0) {
  console.log("[CROSS_TIER_WORLD_FAME_REGRESSION_ROWS]");
  console.table(regressions);
}
console.log("[CROSS_TIER_WORLD_FAME_JSON]", JSON.stringify({ riskRows, regressions }, null, 2));
