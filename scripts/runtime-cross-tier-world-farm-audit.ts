import { getWorldProgressionTierContract, type WorldProgressionTier } from "@game/data";
import { getEncounterRewards } from "@game/gameplay";
import { runEnchantmentShardTtkBenchmark } from "../apps/client/src/data/enchantmentShardTtkBenchmark.js";
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
  readonly killsPerHour: number;
  readonly silverPerHour: number;
  readonly shardsPerHour: number;
}

interface BestRow {
  readonly gearTier: WorldProgressionTier;
  readonly targetTier: WorldProgressionTier;
  readonly weapon: string;
  readonly mode: Mode;
  readonly mastery: number;
  readonly zone: string;
  readonly segment: number;
  readonly seconds: number;
  readonly killsPerHour: number;
  readonly silverPerHour: number;
  readonly shardsPerHour: number;
}

function lateTierMastery(tier: WorldProgressionTier): number {
  const zones = getWorldProgressionTierContract(tier).zones;
  const last = zones.at(-1);
  if (last === undefined) throw new Error(`Missing world progression contract for T${String(tier)}`);
  return last.expected.masteryLevel;
}

function silverPerSegment(
  targetTier: WorldProgressionTier,
  zoneIndex: number,
  segmentIndex: number,
): number {
  const zoneDefId = zoneIdFor(targetTier, zoneIndex);
  const placement = getWorldZonePlacement(zoneDefId);
  let silver = 0;
  for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
    silver += getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    ).silver;
  }
  return silver;
}

function toRate(quantityPerSegment: number, seconds: number): number {
  return seconds > 0 ? quantityPerSegment / (seconds / 3600) : 0;
}

function bestBy(
  rows: readonly FarmRow[],
  metric: "silverPerHour" | "shardsPerHour",
): FarmRow | undefined {
  return rows.reduce<FarmRow | undefined>((best, row) => {
    if (best === undefined || row[metric] > best[metric]) return row;
    return best;
  }, undefined);
}

const rows: FarmRow[] = [];

for (const gearTier of AUDITED_GEAR_TIERS) {
  const mastery = lateTierMastery(gearTier);
  const accessibleTargetTiers = TARGET_TIERS.filter((tier) => tier <= gearTier);

  for (const targetTier of accessibleTargetTiers) {
    const contract = getWorldProgressionTierContract(targetTier);
    for (const zoneContract of contract.zones) {
      const zoneDefId = zoneIdFor(targetTier, zoneContract.zoneIndex);
      const zone = zoneName(String(zoneDefId));

      for (const weaponItemId of weaponItemIds(gearTier)) {
        const weapon = shortWeaponName(weaponItemId);
        const equipmentItemIds = equipmentFor(weaponItemId, gearTier);

        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          const silver = silverPerSegment(targetTier, zoneContract.zoneIndex, segmentIndex);
          for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
            const result = runEnchantmentShardTtkBenchmark({
              label: `cross_tier_farm_t${String(gearTier)}_into_t${String(targetTier)}_${mode}`,
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
              killsPerHour: result.killsPerHour,
              silverPerHour: toRate(silver, result.seconds),
              shardsPerHour: result.expectedShardsPerHour,
            });
          }
        }
      }
    }
  }
}

const bestRows: BestRow[] = [];
for (const gearTier of AUDITED_GEAR_TIERS) {
  const mastery = lateTierMastery(gearTier);
  for (const targetTier of TARGET_TIERS.filter((tier) => tier <= gearTier)) {
    for (const [family, specialization] of WEAPON_FAMILIES) {
      const weapon = `${family} ${specialization}`;
      for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
        const candidates = rows.filter((row) => (
          row.gearTier === gearTier
          && row.targetTier === targetTier
          && row.weapon === weapon
          && row.mode === mode
        ));
        const bestSilver = bestBy(candidates, "silverPerHour");
        const bestShards = bestBy(candidates, "shardsPerHour");
        const representative = bestSilver ?? bestShards;
        if (representative === undefined) continue;
        bestRows.push({
          gearTier,
          targetTier,
          weapon,
          mode,
          mastery,
          zone: representative.zone,
          segment: representative.segment,
          seconds: representative.seconds,
          killsPerHour: representative.killsPerHour,
          silverPerHour: bestSilver?.silverPerHour ?? 0,
          shardsPerHour: bestShards?.shardsPerHour ?? 0,
        });
      }
    }
  }
}

interface RiskRow {
  readonly gear: string;
  readonly weapon: string;
  readonly mode: Mode;
  readonly mastery: number;
  readonly currentSilverH: number;
  readonly bestLegacySilverH: number;
  readonly legacySilverVsCurrent: string;
  readonly legacySilverTier: string;
  readonly currentShardsH: number;
  readonly bestLegacyShardsH: number;
  readonly legacyShardsVsCurrent: string;
  readonly legacyShardTier: string;
}

const riskRows: RiskRow[] = [];
for (const gearTier of AUDITED_GEAR_TIERS) {
  const mastery = lateTierMastery(gearTier);
  for (const [family, specialization] of WEAPON_FAMILIES) {
    const weapon = `${family} ${specialization}`;
    for (const mode of ["afk", "potion"] as const satisfies readonly Mode[]) {
      const current = bestRows.filter((row) => (
        row.gearTier === gearTier
        && row.targetTier === gearTier
        && row.weapon === weapon
        && row.mode === mode
      ));
      const legacy = bestRows.filter((row) => (
        row.gearTier === gearTier
        && row.targetTier < gearTier
        && row.weapon === weapon
        && row.mode === mode
      ));
      const currentSilver = bestBy(current, "silverPerHour");
      const currentShards = bestBy(current, "shardsPerHour");
      const legacySilver = bestBy(legacy, "silverPerHour");
      const legacyShards = bestBy(legacy, "shardsPerHour");
      if (currentSilver === undefined || currentShards === undefined) continue;

      const silverRatio = legacySilver === undefined || currentSilver.silverPerHour <= 0
        ? 0
        : legacySilver.silverPerHour / currentSilver.silverPerHour;
      const shardRatio = legacyShards === undefined || currentShards.shardsPerHour <= 0
        ? 0
        : legacyShards.shardsPerHour / currentShards.shardsPerHour;

      riskRows.push({
        gear: `T${String(gearTier)}.${String(ENCHANTMENT)}`,
        weapon,
        mode,
        mastery,
        currentSilverH: Number(currentSilver.silverPerHour.toFixed(0)),
        bestLegacySilverH: Number((legacySilver?.silverPerHour ?? 0).toFixed(0)),
        legacySilverVsCurrent: `${(silverRatio * 100).toFixed(1)}%`,
        legacySilverTier: legacySilver === undefined ? "-" : `T${String(legacySilver.targetTier)}`,
        currentShardsH: Number(currentShards.shardsPerHour.toFixed(2)),
        bestLegacyShardsH: Number((legacyShards?.shardsPerHour ?? 0).toFixed(2)),
        legacyShardsVsCurrent: `${(shardRatio * 100).toFixed(1)}%`,
        legacyShardTier: legacyShards === undefined ? "-" : `T${String(legacyShards.targetTier)}`,
      });
    }
  }
}

const silverRegressions = riskRows.filter((row) => Number.parseFloat(row.legacySilverVsCurrent) >= 100);
const shardRegressions = riskRows.filter((row) => Number.parseFloat(row.legacyShardsVsCurrent) >= 100);

console.log("[CROSS_TIER_WORLD_FARM_AUDIT_CONTRACT]", {
  gear: "T5.3-T8.3 full same-tier packages",
  targetZones: "all already-unlocked T4-T8 world progression zones at or below gear tier",
  mastery: "final authored expected World mastery of the equipped gear tier",
  weapons: WEAPON_FAMILIES.length,
  modes: ["afk", "potion"],
  rewards: "Silver uses live getEncounterRewards; shards use live runEnchantmentShardTtkBenchmark expected-drop model",
  purpose: "detect whether overgearing makes a lower-tier World band outperform the current-tier band for Silver/h or enchantment-shards/h",
});

console.log("[CROSS_TIER_WORLD_FARM_RISK_SUMMARY]");
console.table(riskRows);

console.log("[CROSS_TIER_WORLD_FARM_REGRESSIONS]", {
  silverLegacyBeatsOrEqualsCurrent: silverRegressions.length,
  shardLegacyBeatsOrEqualsCurrent: shardRegressions.length,
  totalProfiles: riskRows.length,
});

if (silverRegressions.length > 0) {
  console.log("[CROSS_TIER_WORLD_FARM_SILVER_REGRESSIONS]");
  console.table(silverRegressions);
}
if (shardRegressions.length > 0) {
  console.log("[CROSS_TIER_WORLD_FARM_SHARD_REGRESSIONS]");
  console.table(shardRegressions);
}

console.log("[CROSS_TIER_WORLD_FARM_JSON]", JSON.stringify({ riskRows, silverRegressions, shardRegressions }, null, 2));
