import { describe, expect, it } from "vitest";
import { getEncounterRewards } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { getWorldZonePlacement, WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPON_SUFFIXES = ["sword_broadsword", "bow_longbow", "staff_infernal", "gloves_spiked_gauntlets", "dagger_pair"] as const;

type Tier = 3 | 4 | 5 | 6 | 7;
type BenchmarkEnchantment = 0 | 1 | 2 | 3;
type CurveName = "soft_15" | "medium_25" | "hard_35";

type Transition = {
  readonly label: string;
  readonly gearTier: Tier;
  readonly enchantment: BenchmarkEnchantment;
  readonly mastery: number;
  readonly candidateZones: readonly string[];
  readonly islandSilver: number;
  readonly monoBuildingSilver: number;
  readonly workshopSilver: number;
  /** Incremental production-economy time spent since the previous transition. */
  readonly economyHours: number;
};

const TRANSITIONS: readonly Transition[] = [
  {
    label: "T3->T4",
    gearTier: 3,
    enchantment: 0,
    mastery: 10,
    candidateZones: [WORLD_ZONE_IDS.forest, WORLD_ZONE_IDS.swamp, WORLD_ZONE_IDS.highland, WORLD_ZONE_IDS.steppe],
    islandSilver: 1000,
    monoBuildingSilver: 300,
    workshopSilver: 500,
    economyHours: 0.72,
  },
  {
    label: "T4->T5",
    gearTier: 4,
    enchantment: 3,
    mastery: 23,
    candidateZones: [WORLD_ZONE_IDS.mountain, WORLD_ZONE_IDS.amberwood],
    islandSilver: 2500,
    monoBuildingSilver: 700,
    workshopSilver: 1200,
    economyHours: 5.18 - 0.72,
  },
  {
    label: "T5->T6",
    gearTier: 5,
    enchantment: 3,
    mastery: 36,
    candidateZones: [WORLD_ZONE_IDS.ironveil, WORLD_ZONE_IDS.cinderwood],
    islandSilver: 6000,
    monoBuildingSilver: 1500,
    workshopSilver: 2500,
    economyHours: 13.81 - 5.18,
  },
  {
    label: "T6->T7",
    gearTier: 6,
    enchantment: 3,
    mastery: 46,
    candidateZones: [WORLD_ZONE_IDS.ashenpeak, WORLD_ZONE_IDS.bloodwood],
    islandSilver: 12000,
    monoBuildingSilver: 3000,
    workshopSilver: 5000,
    economyHours: 31.88 - 13.81,
  },
  {
    label: "T7->T8",
    gearTier: 7,
    enchantment: 3,
    mastery: 56,
    candidateZones: [WORLD_ZONE_IDS.doompeak, WORLD_ZONE_IDS.blackwood],
    islandSilver: 24000,
    monoBuildingSilver: 6000,
    workshopSilver: 10000,
    economyHours: 58.27 - 31.88,
  },
] as const;

const CURVES: readonly { readonly name: CurveName; readonly share: number }[] = [
  { name: "soft_15", share: 0.15 },
  { name: "medium_25", share: 0.25 },
  { name: "hard_35", share: 0.35 },
] as const;

function weaponItemId(tier: Tier, suffix: (typeof WEAPON_SUFFIXES)[number]): string {
  const [family, specialization] = suffix.split("_");
  if (family === "staff") return `item_weapon_staff_t${String(tier)}_${specialization}`;
  if (family === "gloves") return `item_weapon_gloves_t${String(tier)}_spiked_gauntlets`;
  if (family === "dagger") return `item_weapon_dagger_t${String(tier)}_pair`;
  return `item_weapon_${family}_t${String(tier)}_${specialization}`;
}

function equipmentFor(tier: Tier, weaponId: string): readonly string[] {
  const items: string[] = tier === 3
    ? ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"]
    : [`item_helmet_t${String(tier)}_reinforced`, `item_armor_t${String(tier)}_leather`, `item_boots_t${String(tier)}_leather`, "item_traveler_cape"];
  if (resolveEquipmentInfo(weaponId)?.handling === "one_handed") {
    items.push(tier === 3 ? "item_shield_t3_reinforced" : `item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function segmentSilver(zoneDefId: string, segmentIndex: number): number {
  const placement = getWorldZonePlacement(zoneDefId);
  let silver = 0;
  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    silver += getEncounterRewards(placement.zoneIndexWithinBand, segmentIndex, encounterIndex, placement.bandId).silver;
  }
  return silver;
}

function round1(value: number): number { return Number(value.toFixed(1)); }
function round2(value: number): number { return Number(value.toFixed(2)); }
function roundToNearest(value: number, step: number): number { return Math.max(step, Math.round(value / step) * step); }

function bestFarmFor(transition: Transition, weaponId: string) {
  let best: { zone: string; segment: number; silverPerHour: number; hpPercent: number } | undefined;

  for (const zoneDefId of transition.candidateZones) {
    for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
      const result = runCombatRuntimeBenchmark({
        label: `${transition.label}_${weaponId}_${zoneDefId}_s${String(segmentIndex + 1)}`,
        weaponItemId: weaponId,
        zoneDefId: zoneDefId as never,
        segmentIndex,
        equipmentItemIds: equipmentFor(transition.gearTier, weaponId),
        masteryLevel: transition.mastery,
        enchantment: transition.enchantment,
        useHealthPotions: false,
      });
      if (!result.clear || result.seconds <= 0) continue;
      const silverPerHour = segmentSilver(zoneDefId, segmentIndex) * 3600 / result.seconds;
      if (best === undefined || silverPerHour > best.silverPerHour) {
        best = { zone: zoneDefId, segment: segmentIndex + 1, silverPerHour, hpPercent: result.hpPercent };
      }
    }
  }

  return best;
}

describe("island Silver pacing diagnostic", () => {
  it("measures current sinks and compares 15/25/35 percent candidate curves", () => {
    const detailRows = TRANSITIONS.flatMap((transition) => WEAPON_SUFFIXES.map((suffix) => {
      const weaponId = weaponItemId(transition.gearTier, suffix);
      const best = bestFarmFor(transition, weaponId);
      return {
        transition: transition.label,
        weapon: suffix,
        gear: `T${String(transition.gearTier)}.${String(transition.enchantment)}`,
        mastery: transition.mastery,
        bestZone: best?.zone ?? "none",
        segment: best?.segment ?? null,
        silverPerHour: best === undefined ? 0 : round1(best.silverPerHour),
        hpPercent: best === undefined ? 0 : round1(best.hpPercent),
      };
    }));

    const summaryRows = TRANSITIONS.map((transition) => {
      const rows = detailRows.filter((row) => row.transition === transition.label);
      const viable = rows.filter((row) => row.silverPerHour > 0);
      const totalSilverSink = transition.islandSilver + transition.monoBuildingSilver * 8 + transition.workshopSilver;
      const minRate = viable.length === 0 ? 0 : Math.min(...viable.map((row) => row.silverPerHour));
      const avgRate = viable.length === 0 ? 0 : viable.reduce((sum, row) => sum + row.silverPerHour, 0) / viable.length;
      const maxRate = viable.length === 0 ? 0 : Math.max(...viable.map((row) => row.silverPerHour));
      return {
        transition: transition.label,
        economyHours: round2(transition.economyHours),
        totalSilverSink,
        allWeaponsViable: viable.length === WEAPON_SUFFIXES.length,
        minSilverPerHour: round1(minRate),
        avgSilverPerHour: round1(avgRate),
        maxSilverPerHour: round1(maxRate),
        currentHoursAtAvgRate: avgRate <= 0 ? null : round2(totalSilverSink / avgRate),
        currentShareOfEconomyTime: avgRate <= 0 ? null : round1((totalSilverSink / avgRate) / transition.economyHours * 100),
      };
    });

    const curveRows = summaryRows.flatMap((summary) => CURVES.map((curve) => {
      const targetHours = summary.economyHours * curve.share;
      const rawTargetSilver = summary.avgSilverPerHour * targetHours;
      const targetSilver = summary.avgSilverPerHour <= 0 ? 0 : roundToNearest(rawTargetSilver, rawTargetSilver < 100_000 ? 5_000 : 25_000);
      return {
        transition: summary.transition,
        curve: curve.name,
        economyHours: summary.economyHours,
        avgSilverPerHour: summary.avgSilverPerHour,
        targetFarmHours: round2(targetHours),
        targetSilverSink: targetSilver,
        actualFarmHoursAfterRounding: summary.avgSilverPerHour <= 0 ? null : round2(targetSilver / summary.avgSilverPerHour),
      };
    }));

    console.log("[ISLAND_SILVER_PACING_DETAIL]");
    console.table(detailRows);
    console.log("[ISLAND_SILVER_PACING_SUMMARY]");
    console.table(summaryRows);
    console.log("[ISLAND_SILVER_CANDIDATE_CURVES]");
    console.table(curveRows);
    console.log("[ISLAND_SILVER_CANDIDATE_CURVES_JSON]", JSON.stringify(curveRows, null, 2));

    expect(detailRows).toHaveLength(TRANSITIONS.length * WEAPON_SUFFIXES.length);
    expect(summaryRows).toHaveLength(TRANSITIONS.length);
    expect(curveRows).toHaveLength(TRANSITIONS.length * CURVES.length);
  });
});
