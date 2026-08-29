import { getWorldProgressionTierContract, type WorldProgressionTier } from "@game/data";
import { getEncounterRewards, WEAPON_MASTERY_XP } from "@game/gameplay";
import { getWorldZonePlacement } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";
import {
  equipmentFor,
  shortWeaponName,
  weaponItemIds,
  zoneIdFor,
} from "./lib/world-progression-benchmark.js";

const AUDITED_TIERS = [7, 8] as const satisfies readonly WorldProgressionTier[];
const ENCHANTMENT = 3 as const;
const SEGMENTS_PER_ZONE = 10;
const ENCOUNTERS_PER_SEGMENT = 5;
const CANDIDATE_REWARD_MULTIPLIER: Readonly<Record<7 | 8, number>> = { 7: 1.2, 8: 1.48 };
const CURVE_PHASES = [
  { fromLevel: 1, toLevel: 65, xpMultiplier: 1 },
  { fromLevel: 66, toLevel: 80, xpMultiplier: 1.2 },
  { fromLevel: 81, toLevel: 100, xpMultiplier: 1.48 },
] as const;
const CHECKPOINTS = [50, 65, 80, 100] as const;

type Mode = "afk" | "potion";

function lateTierMastery(tier: WorldProgressionTier): number {
  const last = getWorldProgressionTierContract(tier).zones.at(-1);
  if (last === undefined) throw new Error(`Missing world progression contract for T${String(tier)}`);
  return last.expected.masteryLevel;
}

function famePerSegment(tier: WorldProgressionTier, zoneIndex: number, segmentIndex: number): number {
  const zoneDefId = zoneIdFor(tier, zoneIndex);
  const placement = getWorldZonePlacement(zoneDefId);
  let fame = 0;
  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    fame += getEncounterRewards(placement.zoneIndexWithinBand, segmentIndex, encounterIndex, placement.bandId).fame;
  }
  return fame;
}

function toRate(amount: number, seconds: number): number {
  return seconds > 0 ? amount / (seconds / 3600) : 0;
}

function roundXpRequirement(rawXp: number): number {
  if (rawXp < 10_000) return Math.round(rawXp / 10) * 10;
  if (rawXp < 100_000) return Math.round(rawXp / 100) * 100;
  return Math.round(rawXp / 1000) * 1000;
}

function phaseMultiplierForLevel(level: number): number {
  const phase = CURVE_PHASES.find(({ fromLevel, toLevel }) => level >= fromLevel && level <= toLevel);
  if (phase === undefined) throw new Error(`Missing candidate mastery phase for level ${String(level)}`);
  return phase.xpMultiplier;
}

const candidateXp = WEAPON_MASTERY_XP.map((xp, index) => {
  const level = index + 1;
  return roundXpRequirement(xp * phaseMultiplierForLevel(level));
});

function cumulativeXp(curve: readonly number[], level: number): number {
  return curve.slice(0, Math.min(level, curve.length)).reduce((sum, xp) => sum + xp, 0);
}

function segmentXp(curve: readonly number[], fromLevel: number, toLevel: number): number {
  return cumulativeXp(curve, toLevel) - cumulativeXp(curve, fromLevel);
}

function hoursForXp(xp: number, famePerHour: number): number {
  return famePerHour > 0 ? xp / famePerHour : Number.POSITIVE_INFINITY;
}

function fmtHours(hours: number): string {
  if (!Number.isFinite(hours)) return "∞";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(2)}h`;
}

const farmRows: Array<{
  tier: 7 | 8;
  weapon: string;
  mode: Mode;
  mastery: number;
  fameHLive: number;
  fameHCandidate: number;
}> = [];

for (const tier of AUDITED_TIERS) {
  const mastery = lateTierMastery(tier);
  const contract = getWorldProgressionTierContract(tier);
  for (const weaponItemId of weaponItemIds(tier)) {
    const weapon = shortWeaponName(weaponItemId);
    const equipmentItemIds = equipmentFor(weaponItemId, tier);
    for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
      let bestLive = 0;
      for (const zoneContract of contract.zones) {
        const zoneDefId = zoneIdFor(tier, zoneContract.zoneIndex);
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({
            label: `mastery_endgame_curve_t${String(tier)}_${mode}`,
            weaponItemId,
            zoneDefId,
            segmentIndex,
            equipmentItemIds,
            masteryLevel: mastery,
            enchantment: ENCHANTMENT,
            useHealthPotions: mode === "potion",
          });
          if (!result.clear || result.seconds <= 0) continue;
          bestLive = Math.max(bestLive, toRate(famePerSegment(tier, zoneContract.zoneIndex, segmentIndex), result.seconds));
        }
      }
      farmRows.push({
        tier,
        weapon,
        mode,
        mastery,
        fameHLive: bestLive,
        fameHCandidate: bestLive * CANDIDATE_REWARD_MULTIPLIER[tier],
      });
    }
  }
}

const summary = farmRows.map((row) => {
  const targetFrom = row.tier === 7 ? 65 : 80;
  const targetTo = row.tier === 7 ? 80 : 100;
  const liveSegmentXp = segmentXp(WEAPON_MASTERY_XP, targetFrom, targetTo);
  const candidateSegmentXp = segmentXp(candidateXp, targetFrom, targetTo);
  return {
    tier: `T${String(row.tier)}.3`,
    weapon: row.weapon,
    mode: row.mode,
    masteryBenchmark: row.mastery,
    fameHLive: Number(row.fameHLive.toFixed(0)),
    fameHCandidate: Number(row.fameHCandidate.toFixed(0)),
    segment: `${String(targetFrom)}→${String(targetTo)}`,
    segmentXpLive: liveSegmentXp,
    segmentXpCandidate: candidateSegmentXp,
    xpIncrease: `${((candidateSegmentXp / liveSegmentXp - 1) * 100).toFixed(1)}%`,
    liveHours: fmtHours(hoursForXp(liveSegmentXp, row.fameHLive)),
    rewardOnlyHours: fmtHours(hoursForXp(liveSegmentXp, row.fameHCandidate)),
    candidateCurveHours: fmtHours(hoursForXp(candidateSegmentXp, row.fameHCandidate)),
    pacingVsLive: `${((hoursForXp(candidateSegmentXp, row.fameHCandidate) / hoursForXp(liveSegmentXp, row.fameHLive) - 1) * 100).toFixed(1)}%`,
  };
});

console.log("[MASTERY_ENDGAME_CURVE_CANDIDATE_CONTRACT]", {
  liveCurve: "WEAPON_MASTERY_XP",
  rewardCandidates: CANDIDATE_REWARD_MULTIPLIER,
  candidateCurvePhases: CURVE_PHASES,
  intent: "preserve early/mid mastery pacing while absorbing higher T7/T8 Fame throughput into authored endgame XP requirements",
  note: "projection only; no live reward or mastery source changed",
});
console.log("[MASTERY_ENDGAME_CURVE_CANDIDATE_SUMMARY]");
console.table(summary);
console.log("[MASTERY_ENDGAME_CURVE_XP_CHECKPOINTS]", Object.fromEntries(
  CHECKPOINTS.map((level) => [level, {
    live: cumulativeXp(WEAPON_MASTERY_XP, level),
    candidate: cumulativeXp(candidateXp, level),
  }]),
));
console.log("[MASTERY_ENDGAME_CURVE_SEGMENTS]", {
  "65-80": {
    live: segmentXp(WEAPON_MASTERY_XP, 65, 80),
    candidate: segmentXp(candidateXp, 65, 80),
  },
  "80-100": {
    live: segmentXp(WEAPON_MASTERY_XP, 80, 100),
    candidate: segmentXp(candidateXp, 80, 100),
  },
});
