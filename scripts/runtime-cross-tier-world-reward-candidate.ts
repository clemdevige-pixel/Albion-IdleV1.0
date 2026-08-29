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
const REWARD_MULTIPLIER_BY_TIER: Readonly<Record<WorldProgressionTier, number>> = {
  4: 1,
  5: 1,
  6: 1,
  7: 1.2,
  8: 1.48,
};

type Mode = "afk" | "potion";
type Metric = "silverPerHour" | "famePerHour";

interface FarmRow {
  readonly gearTier: WorldProgressionTier;
  readonly targetTier: WorldProgressionTier;
  readonly zone: string;
  readonly segment: number;
  readonly weapon: string;
  readonly mode: Mode;
  readonly mastery: number;
  readonly seconds: number;
  readonly silverPerHour: number;
  readonly famePerHour: number;
}

function lateTierMastery(tier: WorldProgressionTier): number {
  const last = getWorldProgressionTierContract(tier).zones.at(-1);
  if (last === undefined) throw new Error(`Missing world progression contract for T${String(tier)}`);
  return last.expected.masteryLevel;
}

function rewardsPerSegment(
  targetTier: WorldProgressionTier,
  zoneIndex: number,
  segmentIndex: number,
): { readonly silver: number; readonly fame: number } {
  const zoneDefId = zoneIdFor(targetTier, zoneIndex);
  const placement = getWorldZonePlacement(zoneDefId);
  let silver = 0;
  let fame = 0;
  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    const reward = getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    );
    silver += reward.silver;
    fame += reward.fame;
  }
  const multiplier = REWARD_MULTIPLIER_BY_TIER[targetTier];
  return { silver: silver * multiplier, fame: fame * multiplier };
}

function toRate(quantityPerSegment: number, seconds: number): number {
  return seconds > 0 ? quantityPerSegment / (seconds / 3600) : 0;
}

function bestBy(rows: readonly FarmRow[], metric: Metric): FarmRow | undefined {
  return rows.reduce<FarmRow | undefined>((best, row) => {
    if (best === undefined || row[metric] > best[metric]) return row;
    return best;
  }, undefined);
}

const rows: FarmRow[] = [];
for (const gearTier of AUDITED_GEAR_TIERS) {
  const mastery = lateTierMastery(gearTier);
  for (const targetTier of TARGET_TIERS.filter((tier) => tier <= gearTier)) {
    for (const zoneContract of getWorldProgressionTierContract(targetTier).zones) {
      const zoneDefId = zoneIdFor(targetTier, zoneContract.zoneIndex);
      const zone = zoneName(String(zoneDefId));
      for (const weaponItemId of weaponItemIds(gearTier)) {
        const weapon = shortWeaponName(weaponItemId);
        const equipmentItemIds = equipmentFor(weaponItemId, gearTier);
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          const rewards = rewardsPerSegment(targetTier, zoneContract.zoneIndex, segmentIndex);
          for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
            const result = runCombatRuntimeBenchmark({
              label: `cross_tier_reward_candidate_t${String(gearTier)}_into_t${String(targetTier)}_${mode}`,
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
              silverPerHour: toRate(rewards.silver, result.seconds),
              famePerHour: toRate(rewards.fame, result.seconds),
            });
          }
        }
      }
    }
  }
}

interface RiskRow {
  readonly gear: string;
  readonly weapon: string;
  readonly mode: Mode;
  readonly currentSilverH: number;
  readonly bestLegacySilverH: number;
  readonly legacySilverVsCurrent: string;
  readonly legacySilverTier: string;
  readonly currentFameH: number;
  readonly bestLegacyFameH: number;
  readonly legacyFameVsCurrent: string;
  readonly legacyFameTier: string;
}

const riskRows: RiskRow[] = [];
for (const gearTier of AUDITED_GEAR_TIERS) {
  for (const [family, specialization] of WEAPON_FAMILIES) {
    const weapon = `${family} ${specialization}`;
    for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
      const current = rows.filter((row) => row.gearTier === gearTier && row.targetTier === gearTier && row.weapon === weapon && row.mode === mode);
      const legacy = rows.filter((row) => row.gearTier === gearTier && row.targetTier < gearTier && row.weapon === weapon && row.mode === mode);
      const currentSilver = bestBy(current, "silverPerHour");
      const legacySilver = bestBy(legacy, "silverPerHour");
      const currentFame = bestBy(current, "famePerHour");
      const legacyFame = bestBy(legacy, "famePerHour");
      if (currentSilver === undefined || currentFame === undefined) continue;
      const silverRatio = legacySilver === undefined ? 0 : legacySilver.silverPerHour / currentSilver.silverPerHour;
      const fameRatio = legacyFame === undefined ? 0 : legacyFame.famePerHour / currentFame.famePerHour;
      riskRows.push({
        gear: `T${String(gearTier)}.${String(ENCHANTMENT)}`,
        weapon,
        mode,
        currentSilverH: Math.round(currentSilver.silverPerHour),
        bestLegacySilverH: Math.round(legacySilver?.silverPerHour ?? 0),
        legacySilverVsCurrent: `${(silverRatio * 100).toFixed(1)}%`,
        legacySilverTier: legacySilver === undefined ? "-" : `T${String(legacySilver.targetTier)}`,
        currentFameH: Math.round(currentFame.famePerHour),
        bestLegacyFameH: Math.round(legacyFame?.famePerHour ?? 0),
        legacyFameVsCurrent: `${(fameRatio * 100).toFixed(1)}%`,
        legacyFameTier: legacyFame === undefined ? "-" : `T${String(legacyFame.targetTier)}`,
      });
    }
  }
}

const silverAbove90 = riskRows.filter((row) => Number.parseFloat(row.legacySilverVsCurrent) > 90);
const fameAbove90 = riskRows.filter((row) => Number.parseFloat(row.legacyFameVsCurrent) > 90);
const silverRegressions = riskRows.filter((row) => Number.parseFloat(row.legacySilverVsCurrent) >= 100);
const fameRegressions = riskRows.filter((row) => Number.parseFloat(row.legacyFameVsCurrent) >= 100);

console.log("[CROSS_TIER_REWARD_CANDIDATE_CONTRACT]", {
  candidateMultipliers: REWARD_MULTIPLIER_BY_TIER,
  appliedTo: ["silver", "fame"],
  gear: "T5.3-T8.3 full same-tier packages",
  target: "current tier should remain at least about 10% ahead of best legacy tier",
  note: "candidate-only projection; authored live reward data is unchanged",
});
console.log("[CROSS_TIER_REWARD_CANDIDATE_SUMMARY]");
console.table(riskRows);
console.log("[CROSS_TIER_REWARD_CANDIDATE_RESULT]", {
  totalProfiles: riskRows.length,
  silverLegacyAbove90Percent: silverAbove90.length,
  fameLegacyAbove90Percent: fameAbove90.length,
  silverLegacyBeatsOrEqualsCurrent: silverRegressions.length,
  fameLegacyBeatsOrEqualsCurrent: fameRegressions.length,
});
if (silverAbove90.length > 0) {
  console.log("[CROSS_TIER_REWARD_CANDIDATE_SILVER_ABOVE_90]");
  console.table(silverAbove90);
}
if (fameAbove90.length > 0) {
  console.log("[CROSS_TIER_REWARD_CANDIDATE_FAME_ABOVE_90]");
  console.table(fameAbove90);
}
