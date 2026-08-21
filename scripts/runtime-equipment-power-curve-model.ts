import {
  ENCHANTMENT_STAT_MULTIPLIER,
  getEquipmentStatRoundingStep,
  roundEquipmentStatValue,
  type StatId,
} from "@game/gameplay";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { PROGRESSION_EQUIPMENT_CONTENT } from "../apps/client/src/data/nonWeaponEquipmentContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type StatMap = Readonly<Record<string, number>>;
type EquipmentFamily = { readonly familyId: string; readonly itemIdForTier: (tier: Tier) => string };

const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly Tier[];
const SOURCE_TIERS = [4, 5, 6, 7] as const;
const MODELED_STATS = new Set([
  "stat_physical_damage",
  "stat_magical_damage",
  "stat_max_health",
  "stat_armor",
  "stat_magic_resistance",
]);

const WEAPON_FAMILIES: readonly EquipmentFamily[] = [
  { familyId: "broadsword", itemIdForTier: (tier) => `item_weapon_sword_t${String(tier)}_broadsword` },
  { familyId: "longbow", itemIdForTier: (tier) => `item_weapon_bow_t${String(tier)}_longbow` },
  { familyId: "infernal", itemIdForTier: (tier) => `item_weapon_staff_t${String(tier)}_infernal` },
  { familyId: "spiked_gauntlets", itemIdForTier: (tier) => `item_weapon_gloves_t${String(tier)}_spiked_gauntlets` },
  { familyId: "dagger_pair", itemIdForTier: (tier) => `item_weapon_dagger_t${String(tier)}_pair` },
];

const NON_WEAPON_FAMILIES: readonly EquipmentFamily[] = PROGRESSION_EQUIPMENT_CONTENT.map((family) => ({
  familyId: family.familyId,
  itemIdForTier: (tier: Tier) => {
    const item = family.items.find((candidate) => candidate.tier === tier);
    if (item === undefined) throw new Error(`Missing ${family.familyId} T${String(tier)}`);
    return item.itemId;
  },
}));

const EQUIPMENT_FAMILIES = [...WEAPON_FAMILIES, ...NON_WEAPON_FAMILIES] as const;

function statsFor(itemId: string): StatMap {
  const stats = resolveEquipmentInfo(itemId)?.stats;
  if (stats === undefined) throw new Error(`Missing equipment stats for ${itemId}`);
  return Object.fromEntries(Object.entries(stats).filter(([statId, value]) => MODELED_STATS.has(statId) && value > 0));
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error("Cannot compute median of empty values");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

const round4 = (value: number) => Number(value.toFixed(4));
const round2 = (value: number) => Number(value.toFixed(2));
const asStatId = (statId: string) => statId as StatId;
const roundModeledStat = (statId: string, value: number) => roundEquipmentStatValue(asStatId(statId), value);

function familyImpliedGrowth(family: EquipmentFamily) {
  const t4 = statsFor(family.itemIdForTier(4));
  const t8 = statsFor(family.itemIdForTier(8));
  const statFactors = Object.entries(t4).flatMap(([statId, t4Value]) => {
    const t8Value = t8[statId];
    return t8Value === undefined || t4Value <= 0 || t8Value <= 0 ? [] : [Math.pow(t8Value / t4Value, 1 / 4)];
  });
  if (statFactors.length === 0) throw new Error(`No comparable T4/T8 stats for ${family.familyId}`);
  return { familyId: family.familyId, statFactors, familyFactor: median(statFactors) };
}

function pureBase(anchorT4: number, tier: Tier, factor: number, statId: string): number {
  return roundModeledStat(statId, anchorT4 * Math.pow(factor, tier - 4));
}

function constrainedBase(anchorT4: number, tier: Tier, factor: number, statId: string): number {
  let base = roundModeledStat(statId, anchorT4);
  if (tier === 4) return base;
  const quantum = getEquipmentStatRoundingStep(asStatId(statId));
  if (quantum <= 0) throw new Error(`Missing rounding quantum for ${statId}`);

  for (let current = 5 as Tier; current <= tier; current = (current + 1) as Tier) {
    const theoretical = pureBase(anchorT4, current, factor, statId);
    const previousTierThree = roundModeledStat(statId, base * ENCHANTMENT_STAT_MULTIPLIER[3]);
    base = Math.max(theoretical, previousTierThree + quantum);
  }
  return base;
}

function evaluateCurve(
  factor: number,
  baseResolver: (anchorT4: number, tier: Tier, factor: number, statId: string) => number,
) {
  const deviations: number[] = [];
  let transitionFailures = 0;
  let minimumTransitionMargin = Number.POSITIVE_INFINITY;
  let floorApplications = 0;

  for (const family of EQUIPMENT_FAMILIES) {
    const anchor = statsFor(family.itemIdForTier(4));
    for (const [statId, t4Value] of Object.entries(anchor)) {
      for (const tier of TIERS) {
        const live = statsFor(family.itemIdForTier(tier))[statId];
        if (live === undefined) continue;
        const modeled = baseResolver(t4Value, tier, factor, statId);
        deviations.push(modeled === 0 ? 0 : Math.abs((live / modeled - 1) * 100));
        if (tier > 4 && baseResolver === constrainedBase && modeled > pureBase(t4Value, tier, factor, statId)) floorApplications += 1;
      }
      for (const sourceTier of SOURCE_TIERS) {
        const nextTier = (sourceTier + 1) as Tier;
        const sourceBase = baseResolver(t4Value, sourceTier, factor, statId);
        const sourceTierThree = roundModeledStat(statId, sourceBase * ENCHANTMENT_STAT_MULTIPLIER[3]);
        const nextBase = baseResolver(t4Value, nextTier, factor, statId);
        const margin = nextBase - sourceTierThree;
        minimumTransitionMargin = Math.min(minimumTransitionMargin, margin);
        if (margin <= 0) transitionFailures += 1;
      }
    }
  }

  return {
    transitionFailures,
    minimumTransitionMargin,
    floorApplications,
    meanAbsoluteDeviationPercent: deviations.reduce((sum, value) => sum + value, 0) / Math.max(1, deviations.length),
    maxAbsoluteDeviationPercent: Math.max(...deviations),
  };
}

function main(): void {
  const familyGrowth = EQUIPMENT_FAMILIES.map(familyImpliedGrowth);
  const tierGrowthFactor = median(familyGrowth.map((entry) => entry.familyFactor));
  const pure = evaluateCurve(tierGrowthFactor, pureBase);
  const constrained = evaluateCurve(tierGrowthFactor, constrainedBase);

  console.log("[EQUIPMENT_POWER_CURVE_MONOTONIC_MODEL_CONTRACT]", {
    liveMutation: "none",
    anchor: "all live T4 base stats",
    factor: round4(tierGrowthFactor),
    pureFormula: "round(T4 * G^(tier-4))",
    constrainedFormula: "max(pureFormula, round(previousBase * e3) + statRoundingQuantum)",
    roundingQuantumSource: "@game/gameplay getEquipmentStatRoundingStep",
    invariant: "every Tn+1.0 stat is strictly greater than Tn.3 after real gameplay rounding",
  });

  console.log("[EQUIPMENT_POWER_CURVE_IMPLIED_FAMILY_GROWTH]");
  console.table(familyGrowth.map((entry) => ({
    family: entry.familyId,
    familyFactor: round4(entry.familyFactor),
    statFactors: entry.statFactors.map(round4).join(","),
  })));

  const comparisonRows: Array<Record<string, string | number | boolean>> = [];
  for (const family of EQUIPMENT_FAMILIES) {
    const anchor = statsFor(family.itemIdForTier(4));
    for (const [statId, t4Value] of Object.entries(anchor)) {
      for (const tier of TIERS) {
        const live = statsFor(family.itemIdForTier(tier))[statId];
        if (live === undefined) continue;
        const pureValue = pureBase(t4Value, tier, tierGrowthFactor, statId);
        const constrainedValue = constrainedBase(t4Value, tier, tierGrowthFactor, statId);
        comparisonRows.push({
          family: family.familyId,
          stat: statId,
          tier,
          live,
          pure: pureValue,
          constrained: constrainedValue,
          floorApplied: constrainedValue > pureValue,
          constrainedDeltaPercent: constrainedValue === 0 ? 0 : round2((live / constrainedValue - 1) * 100),
        });
      }
    }
  }

  console.log("[EQUIPMENT_POWER_CURVE_CONSTRAINED_VS_LIVE]");
  console.table(comparisonRows);
  console.log("[EQUIPMENT_POWER_CURVE_FLOOR_APPLICATIONS]");
  console.table(comparisonRows.filter((row) => row.floorApplied === true));
  console.log("[EQUIPMENT_POWER_CURVE_MODEL_COMPARISON]", {
    pure: {
      transitionFailures: pure.transitionFailures,
      minimumTransitionMargin: pure.minimumTransitionMargin,
      meanAbsoluteDeviationPercent: round2(pure.meanAbsoluteDeviationPercent),
      maxAbsoluteDeviationPercent: round2(pure.maxAbsoluteDeviationPercent),
    },
    constrained: {
      transitionFailures: constrained.transitionFailures,
      minimumTransitionMargin: constrained.minimumTransitionMargin,
      floorApplications: constrained.floorApplications,
      meanAbsoluteDeviationPercent: round2(constrained.meanAbsoluteDeviationPercent),
      maxAbsoluteDeviationPercent: round2(constrained.maxAbsoluteDeviationPercent),
      structuralPass: constrained.transitionFailures === 0,
    },
  });
}

main();
