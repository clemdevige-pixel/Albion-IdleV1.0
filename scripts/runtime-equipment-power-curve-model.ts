import {
  ENCHANTMENT_STAT_MULTIPLIER,
  roundEquipmentStatValue,
  type StatId,
} from "@game/gameplay";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { PROGRESSION_EQUIPMENT_CONTENT } from "../apps/client/src/data/nonWeaponEquipmentContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type StatMap = Readonly<Record<string, number>>;

type EquipmentFamily = {
  readonly familyId: string;
  readonly itemIdForTier: (tier: Tier) => string;
};

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
  return Object.fromEntries(
    Object.entries(stats).filter(([statId, value]) => MODELED_STATS.has(statId) && value > 0),
  );
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error("Cannot compute median of empty values");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function roundModeledStat(statId: string, value: number): number {
  return roundEquipmentStatValue(statId as StatId, value);
}

function familyImpliedGrowth(family: EquipmentFamily): {
  readonly familyId: string;
  readonly statFactors: readonly number[];
  readonly familyFactor: number;
} {
  const t4 = statsFor(family.itemIdForTier(4));
  const t8 = statsFor(family.itemIdForTier(8));
  const statFactors = Object.entries(t4).flatMap(([statId, t4Value]) => {
    const t8Value = t8[statId];
    if (t8Value === undefined || t4Value <= 0 || t8Value <= 0) return [];
    return [Math.pow(t8Value / t4Value, 1 / 4)];
  });
  if (statFactors.length === 0) throw new Error(`No comparable T4/T8 stats for ${family.familyId}`);
  return {
    familyId: family.familyId,
    statFactors,
    familyFactor: median(statFactors),
  };
}

function theoreticalBase(anchorT4: number, tier: Tier, tierGrowthFactor: number, statId: string): number {
  return roundModeledStat(statId, anchorT4 * Math.pow(tierGrowthFactor, tier - 4));
}

function evaluateFactor(tierGrowthFactor: number): {
  readonly transitionFailures: number;
  readonly meanAbsoluteDeviationPercent: number;
  readonly maxAbsoluteDeviationPercent: number;
  readonly minimumTransitionMargin: number;
} {
  const deviations: number[] = [];
  let transitionFailures = 0;
  let minimumTransitionMargin = Number.POSITIVE_INFINITY;

  for (const family of EQUIPMENT_FAMILIES) {
    const anchor = statsFor(family.itemIdForTier(4));
    for (const [statId, t4Value] of Object.entries(anchor)) {
      for (const tier of TIERS) {
        const live = statsFor(family.itemIdForTier(tier))[statId];
        if (live === undefined) continue;
        const theoretical = theoreticalBase(t4Value, tier, tierGrowthFactor, statId);
        const deviation = theoretical === 0 ? 0 : Math.abs((live / theoretical - 1) * 100);
        deviations.push(deviation);
      }

      for (const sourceTier of SOURCE_TIERS) {
        const nextTier = (sourceTier + 1) as Tier;
        const sourceBase = theoreticalBase(t4Value, sourceTier, tierGrowthFactor, statId);
        const sourceTierThree = roundModeledStat(statId, sourceBase * ENCHANTMENT_STAT_MULTIPLIER[3]);
        const nextBase = theoreticalBase(t4Value, nextTier, tierGrowthFactor, statId);
        const margin = nextBase - sourceTierThree;
        minimumTransitionMargin = Math.min(minimumTransitionMargin, margin);
        if (margin <= 0) transitionFailures += 1;
      }
    }
  }

  return {
    transitionFailures,
    meanAbsoluteDeviationPercent: deviations.reduce((sum, value) => sum + value, 0) / Math.max(1, deviations.length),
    maxAbsoluteDeviationPercent: Math.max(...deviations),
    minimumTransitionMargin,
  };
}

function buildFactorCandidates(start: number): readonly number[] {
  const step = 0.0025;
  const firstGrid = Math.ceil(start / step) * step;
  const values = new Set<number>([round4(start)]);
  for (let factor = firstGrid; factor <= 1.55 + 1e-9; factor += step) values.add(round4(factor));
  return [...values].sort((a, b) => a - b);
}

function main(): void {
  const familyGrowth = EQUIPMENT_FAMILIES.map(familyImpliedGrowth);
  const tierGrowthFactor = median(familyGrowth.map((entry) => entry.familyFactor));
  const requiredFloor = ENCHANTMENT_STAT_MULTIPLIER[3];

  console.log("[EQUIPMENT_POWER_CURVE_MODEL_CONTRACT]", {
    liveMutation: "none",
    anchor: "all live T4 base stats",
    tierFactorDerivation: "median of per-family implied T4→T8 CAGR; each equipment family has equal weight",
    formula: "base(Tn) = round(base(T4) * G^(n-4)); enchanted(Tn.e) = round(base(Tn) * enchantmentMultiplier[e])",
    structuralInvariant: "after real stat rounding, every Tn+1.0 stat must be strictly greater than Tn.3",
    enchantmentCurve: {
      e0: ENCHANTMENT_STAT_MULTIPLIER[0],
      e1: ENCHANTMENT_STAT_MULTIPLIER[1],
      e2: ENCHANTMENT_STAT_MULTIPLIER[2],
      e3: ENCHANTMENT_STAT_MULTIPLIER[3],
    },
  });

  console.log("[EQUIPMENT_POWER_CURVE_IMPLIED_FAMILY_GROWTH]");
  console.table(familyGrowth.map((entry) => ({
    family: entry.familyId,
    familyFactor: round4(entry.familyFactor),
    statFactors: entry.statFactors.map(round4).join(","),
  })));

  console.log("[EQUIPMENT_POWER_CURVE_GLOBAL_FACTOR]", {
    tierGrowthFactor: round4(tierGrowthFactor),
    enchantment3Multiplier: round4(requiredFloor),
    rawMarginOverPreviousTier3Percent: round2((tierGrowthFactor / requiredFloor - 1) * 100),
    structurallyAbovePreviousTier3BeforeRounding: tierGrowthFactor > requiredFloor,
  });

  const comparisonRows: Array<Record<string, string | number>> = [];
  const transitionRows: Array<Record<string, string | number | boolean>> = [];

  for (const family of EQUIPMENT_FAMILIES) {
    const anchor = statsFor(family.itemIdForTier(4));
    for (const [statId, t4Value] of Object.entries(anchor)) {
      for (const tier of TIERS) {
        const live = statsFor(family.itemIdForTier(tier))[statId];
        if (live === undefined) continue;
        const theoretical = theoreticalBase(t4Value, tier, tierGrowthFactor, statId);
        comparisonRows.push({
          family: family.familyId,
          stat: statId,
          tier,
          t4Anchor: t4Value,
          live,
          theoretical,
          delta: live - theoretical,
          deltaPercent: theoretical === 0 ? 0 : round2((live / theoretical - 1) * 100),
        });
      }

      for (const sourceTier of SOURCE_TIERS) {
        const nextTier = (sourceTier + 1) as Tier;
        const sourceBase = theoreticalBase(t4Value, sourceTier, tierGrowthFactor, statId);
        const sourceTierThree = roundModeledStat(statId, sourceBase * ENCHANTMENT_STAT_MULTIPLIER[3]);
        const nextBase = theoreticalBase(t4Value, nextTier, tierGrowthFactor, statId);
        transitionRows.push({
          family: family.familyId,
          stat: statId,
          transition: `T${String(sourceTier)}.3→T${String(nextTier)}.0`,
          previousTier3: sourceTierThree,
          nextTier0: nextBase,
          margin: nextBase - sourceTierThree,
          marginPercent: sourceTierThree === 0 ? 0 : round2((nextBase / sourceTierThree - 1) * 100),
          pass: nextBase > sourceTierThree,
        });
      }
    }
  }

  console.log("[EQUIPMENT_POWER_CURVE_THEORETICAL_VS_LIVE]");
  console.table(comparisonRows);

  console.log("[EQUIPMENT_POWER_CURVE_TIER_TRANSITIONS]");
  console.table(transitionRows);

  const transitionFailures = transitionRows.filter((row) => row.pass === false);
  const deviations = comparisonRows.map((row) => Math.abs(Number(row.deltaPercent)));
  const sortedByDeviation = [...comparisonRows].sort(
    (a, b) => Math.abs(Number(b.deltaPercent)) - Math.abs(Number(a.deltaPercent)),
  );

  console.log("[EQUIPMENT_POWER_CURVE_LARGEST_LIVE_DEVIATIONS]");
  console.table(sortedByDeviation.slice(0, 25));

  const factorRows = buildFactorCandidates(tierGrowthFactor).map((factor) => {
    const result = evaluateFactor(factor);
    return {
      factor,
      transitionFailures: result.transitionFailures,
      minimumTransitionMargin: result.minimumTransitionMargin,
      meanAbsoluteDeviationPercent: round2(result.meanAbsoluteDeviationPercent),
      maxAbsoluteDeviationPercent: round2(result.maxAbsoluteDeviationPercent),
      structuralPass: result.transitionFailures === 0,
    };
  });
  const firstStructuralPass = factorRows.find((row) => row.structuralPass);

  console.log("[EQUIPMENT_POWER_CURVE_FACTOR_CANDIDATES]");
  console.table(factorRows);
  console.log("[EQUIPMENT_POWER_CURVE_FIRST_STRUCTURAL_PASS]", firstStructuralPass ?? null);

  console.log("[EQUIPMENT_POWER_CURVE_MODEL_RESULT]", {
    tierGrowthFactor: round4(tierGrowthFactor),
    familyCount: EQUIPMENT_FAMILIES.length,
    modeledStatRows: comparisonRows.length,
    meanAbsoluteDeviationPercent: round2(deviations.reduce((sum, value) => sum + value, 0) / Math.max(1, deviations.length)),
    maxAbsoluteDeviationPercent: round2(Math.max(...deviations)),
    tierTransitionFailures: transitionFailures.length,
    structuralContract: transitionFailures.length === 0 ? "PASS" : "FAIL",
    firstStructuralPassFactor: firstStructuralPass?.factor ?? null,
  });
}

main();
