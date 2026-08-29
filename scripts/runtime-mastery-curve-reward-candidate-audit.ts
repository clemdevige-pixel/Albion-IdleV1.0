import { getWorldProgressionTierContract, type WorldProgressionTier } from "@game/data";
import { getEncounterRewards, WEAPON_MASTERY_XP } from "@game/gameplay";
import { getWorldZonePlacement } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";
import {
  WEAPON_FAMILIES,
  equipmentFor,
  shortWeaponName,
  weaponItemIds,
  zoneIdFor,
} from "./lib/world-progression-benchmark.js";

const AUDITED_TIERS = [7, 8] as const satisfies readonly WorldProgressionTier[];
const ENCHANTMENT = 3 as const;
const SEGMENTS_PER_ZONE = 10;
const ENCOUNTERS_PER_SEGMENT = 5;
const CANDIDATE_REWARD_MULTIPLIER: Readonly<Record<7 | 8, number>> = {
  7: 1.2,
  8: 1.48,
};
const CHECKPOINTS = [50, 65, 80, 100] as const;

type Mode = "afk" | "potion";

interface FameFarmRow {
  readonly tier: 7 | 8;
  readonly weapon: string;
  readonly mode: Mode;
  readonly mastery: number;
  readonly famePerHourLive: number;
  readonly famePerHourCandidate: number;
}

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
    fame += getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    ).fame;
  }
  return fame;
}

function toRate(amount: number, seconds: number): number {
  return seconds > 0 ? amount / (seconds / 3600) : 0;
}

function cumulativeXpToLevel(level: number): number {
  if (level <= 0) return 0;
  return WEAPON_MASTERY_XP.slice(0, Math.min(level, WEAPON_MASTERY_XP.length))
    .reduce((sum, xp) => sum + xp, 0);
}

function hoursForXp(xp: number, famePerHour: number): number {
  return famePerHour > 0 ? xp / famePerHour : Number.POSITIVE_INFINITY;
}

function fmtHours(hours: number): string {
  if (!Number.isFinite(hours)) return "∞";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(2)}h`;
}

const rows: FameFarmRow[] = [];

for (const tier of AUDITED_TIERS) {
  const mastery = lateTierMastery(tier);
  const multiplier = CANDIDATE_REWARD_MULTIPLIER[tier];
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
            label: `mastery_curve_candidate_t${String(tier)}_${mode}`,
            weaponItemId,
            zoneDefId,
            segmentIndex,
            equipmentItemIds,
            masteryLevel: mastery,
            enchantment: ENCHANTMENT,
            useHealthPotions: mode === "potion",
          });
          if (!result.clear || result.seconds <= 0) continue;
          const fame = famePerSegment(tier, zoneContract.zoneIndex, segmentIndex);
          bestLive = Math.max(bestLive, toRate(fame, result.seconds));
        }
      }
      rows.push({
        tier,
        weapon,
        mode,
        mastery,
        famePerHourLive: bestLive,
        famePerHourCandidate: bestLive * multiplier,
      });
    }
  }
}

const summary = rows.map((row) => {
  const checkpointData = Object.fromEntries(CHECKPOINTS.flatMap((level) => {
    const xp = cumulativeXpToLevel(level);
    return [
      [`L${String(level)}Live`, fmtHours(hoursForXp(xp, row.famePerHourLive))],
      [`L${String(level)}Candidate`, fmtHours(hoursForXp(xp, row.famePerHourCandidate))],
    ];
  }));
  return {
    tier: `T${String(row.tier)}.3`,
    weapon: row.weapon,
    mode: row.mode,
    masteryBenchmark: row.mastery,
    fameHLive: Number(row.famePerHourLive.toFixed(0)),
    fameHCandidate: Number(row.famePerHourCandidate.toFixed(0)),
    timeReduction: `${((1 - row.famePerHourLive / row.famePerHourCandidate) * 100).toFixed(1)}%`,
    ...checkpointData,
  };
});

console.log("[MASTERY_CURVE_REWARD_CANDIDATE_CONTRACT]", {
  masteryCurve: "live WEAPON_MASTERY_XP generated from canonical mastery experience balance",
  tiers: AUDITED_TIERS,
  candidateRewardMultipliers: CANDIDATE_REWARD_MULTIPLIER,
  loadout: "full same-tier Tn.3, final authored expected mastery for the tier",
  farm: "best current-tier World Fame/h per representative weapon and mode",
  checkpoints: CHECKPOINTS,
  note: "projection only; no authored reward or mastery data changed",
});
console.log("[MASTERY_CURVE_REWARD_CANDIDATE_SUMMARY]");
console.table(summary);
console.log("[MASTERY_CURVE_XP_CHECKPOINTS]", Object.fromEntries(
  CHECKPOINTS.map((level) => [level, cumulativeXpToLevel(level)]),
));
