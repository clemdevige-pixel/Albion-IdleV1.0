import { describe, expect, it } from "vitest";
import { GATHERING_MASTERY_XP } from "@game/gameplay";
import {
  getHeroGatheringXpForTier,
  getHeroGatheringXpFromWorkerForTier,
  getWorkerGatheringXpForTier,
} from "./progressionContentCatalog.js";
import {
  getProductionTierRules,
  type ProductionTier,
} from "./productionFamilyCatalog.js";

const TICK_SECONDS = 0.5;
const FAMILIES = ["wood", "ore", "hide", "fiber"] as const;
type Family = (typeof FAMILIES)[number];

const THRESHOLD_PROFILES = {
  current: { 4: 3, 5: 6, 6: 9, 7: 12, 8: 15 },
  moderate: { 4: 5, 5: 10, 6: 15, 7: 20, 8: 25 },
  demanding: { 4: 5, 5: 15, 6: 30, 7: 45, 8: 60 },
} as const satisfies Record<string, Record<4 | 5 | 6 | 7 | 8, number>>;

const CURRENT_MONO_BUILDING_COST = { 4: 12, 5: 20, 6: 30, 7: 40, 8: null } as const;
const CURRENT_WORKSHOP_PER_WOOD_ORE = { 4: 10, 5: 16, 6: 24, 7: 32, 8: null } as const;

/** Diagnostic only: candidate curve discussed during the balance audit, not authoritative game data. */
const TRIAL_MONO_BUILDING_COST = { 4: 15, 5: 40, 6: 70, 7: 110, 8: 160 } as const;

interface FamilyState {
  heroXp: number;
  workerXp: number;
  heroRemaining: number;
  workerRemaining: number;
  raw: Record<ProductionTier, number>;
  refined: Record<ProductionTier, number>;
}

interface SimulationState {
  tier: ProductionTier;
  ticks: number;
  activeFamilyIndex: number;
  families: Record<Family, FamilyState>;
}

function emptyTierRecord(): Record<ProductionTier, number> {
  return { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
}

function masteryLevelFromXp(totalXp: number): number {
  let remaining = Math.max(0, totalXp);
  let level = 0;
  for (const required of GATHERING_MASTERY_XP) {
    if (remaining < required) break;
    remaining -= required;
    level += 1;
  }
  return Math.min(100, level);
}

function workerLevelFromXp(totalXp: number): number {
  return Math.min(100, Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)));
}

function heroGatherTicks(tier: ProductionTier, heroXp: number): number {
  const rules = getProductionTierRules(tier);
  const level = masteryLevelFromXp(heroXp);
  const masteryModifier = Math.max(0.5, 1 - Math.min(100, level) * 0.005);
  return Math.max(1, Math.ceil(rules.gatheringBaseTicks * rules.gatheringToolSpeedModifier * masteryModifier));
}

function workerGatherTicks(tier: ProductionTier, workerXp: number): number {
  const rules = getProductionTierRules(tier);
  const level = workerLevelFromXp(workerXp);
  const speedModifier = rules.workerSpeedModifier * (1 + level * 0.005);
  return Math.max(1, Math.ceil(60 / Math.max(0.01, speedModifier)));
}

function createState(): SimulationState {
  const families = Object.fromEntries(FAMILIES.map((family) => [family, {
    heroXp: 0,
    workerXp: 0,
    heroRemaining: heroGatherTicks(3, 0),
    workerRemaining: workerGatherTicks(3, 0),
    raw: emptyTierRecord(),
    refined: emptyTierRecord(),
  }])) as Record<Family, FamilyState>;
  return { tier: 3, ticks: 0, activeFamilyIndex: 0, families };
}

function tick(state: SimulationState): void {
  state.ticks += 1;

  // Four workers run in parallel: one per family (current worker-house capacity = 4).
  for (const family of FAMILIES) {
    const data = state.families[family];
    data.workerRemaining -= 1;
    if (data.workerRemaining <= 0) {
      data.raw[state.tier] += 1;
      data.workerXp += getWorkerGatheringXpForTier(state.tier);
      data.heroXp += getHeroGatheringXpFromWorkerForTier(state.tier);
      data.workerRemaining = workerGatherTicks(state.tier, data.workerXp);
    }
  }

  // The hero can only gather one family at once. Round-robin by completed active cycle.
  const activeFamily = FAMILIES[state.activeFamilyIndex] ?? "wood";
  const active = state.families[activeFamily];
  active.heroRemaining -= 1;
  if (active.heroRemaining <= 0) {
    active.raw[state.tier] += 1;
    active.heroXp += getHeroGatheringXpForTier(state.tier);
    active.heroRemaining = heroGatherTicks(state.tier, active.heroXp);
    state.activeFamilyIndex = (state.activeFamilyIndex + 1) % FAMILIES.length;
  }
}

function allHeroMasteriesAtLeast(state: SimulationState, level: number): boolean {
  return FAMILIES.every((family) => masteryLevelFromXp(state.families[family].heroXp) >= level);
}

function canProduceRefined(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  const raw = { ...data.raw };
  const refined = { ...data.refined };
  const ensure = (targetTier: ProductionTier, needed: number): boolean => {
    if (refined[targetTier] >= needed) return true;
    const missing = needed - refined[targetTier];
    if (targetTier === 3) {
      const rawNeeded = missing * 4;
      if (raw[3] < rawNeeded) return false;
      raw[3] -= rawNeeded;
      refined[3] += missing;
      return true;
    }
    const previousTier = (targetTier - 1) as ProductionTier;
    if (!ensure(previousTier, missing)) return false;
    const rawNeeded = missing * 2;
    if (raw[targetTier] < rawNeeded) return false;
    raw[targetTier] -= rawNeeded;
    refined[previousTier] -= missing;
    refined[targetTier] += missing;
    return true;
  };
  return ensure(tier, amount);
}

function produceRefined(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  if (data.refined[tier] >= amount) return true;
  const missing = amount - data.refined[tier];
  if (tier === 3) {
    const rawNeeded = missing * 4;
    if (data.raw[3] < rawNeeded) return false;
    data.raw[3] -= rawNeeded;
    data.refined[3] += missing;
    return true;
  }
  const previousTier = (tier - 1) as ProductionTier;
  if (!produceRefined(data, previousTier, missing)) return false;
  const rawNeeded = missing * 2;
  if (data.raw[tier] < rawNeeded) return false;
  data.raw[tier] -= rawNeeded;
  data.refined[previousTier] -= missing;
  data.refined[tier] += missing;
  return true;
}

function spendRefined(state: SimulationState, tier: ProductionTier, costs: Record<Family, number>): boolean {
  if (!FAMILIES.every((family) => canProduceRefined(state.families[family], tier, costs[family]))) return false;
  for (const family of FAMILIES) {
    const data = state.families[family];
    if (!produceRefined(data, tier, costs[family])) return false;
    data.refined[tier] -= costs[family];
  }
  return true;
}

function representativeSetCost(tier: ProductionTier): Record<Family, number> {
  if (tier === 3) return { wood: 6, ore: 4, hide: 10, fiber: 5 };
  const index = tier - 4;
  return {
    wood: 6,
    ore: 6 + index,
    hide: 14 + index * 3,
    fiber: 7 + index * 2,
  };
}

function currentBuildingCost(targetTier: 4 | 5 | 6 | 7 | 8): Record<Family, number> | null {
  const mono = CURRENT_MONO_BUILDING_COST[targetTier];
  const workshop = CURRENT_WORKSHOP_PER_WOOD_ORE[targetTier];
  if (mono === null || workshop === null) return null;
  return { wood: mono * 2 + workshop, ore: mono * 2 + workshop, hide: mono * 2, fiber: mono * 2 };
}

function trialBuildingCost(targetTier: 4 | 5 | 6 | 7 | 8): Record<Family, number> {
  const mono = TRIAL_MONO_BUILDING_COST[targetTier];
  const workshopPerWoodOre = mono / 2;
  return { wood: mono * 2 + workshopPerWoodOre, ore: mono * 2 + workshopPerWoodOre, hide: mono * 2, fiber: mono * 2 };
}

function hours(state: SimulationState): number {
  return Number(((state.ticks * TICK_SECONDS) / 3600).toFixed(2));
}

function minimumHeroLevel(state: SimulationState): number {
  return Math.min(...FAMILIES.map((family) => masteryLevelFromXp(state.families[family].heroXp)));
}

function snapshotStocks(state: SimulationState, tier: ProductionTier): string {
  return FAMILIES.map((family) => {
    const data = state.families[family];
    return `${family}:${data.raw[tier]}r/${data.refined[tier]}f`;
  }).join(" ");
}

function runSequential(
  thresholdProfileName: keyof typeof THRESHOLD_PROFILES,
  buildingModel: "current" | "trial",
) {
  const thresholds = THRESHOLD_PROFILES[thresholdProfileName];
  const state = createState();
  const rows: Array<Record<string, string | number | boolean | null>> = [];

  for (const tier of [3, 4, 5, 6, 7, 8] as const) {
    state.tier = tier;
    for (const family of FAMILIES) {
      state.families[family].heroRemaining = heroGatherTicks(tier, state.families[family].heroXp);
      state.families[family].workerRemaining = workerGatherTicks(tier, state.families[family].workerXp);
    }

    let craftHours: number | null = null;
    if (tier >= 4) {
      const craftCost = representativeSetCost(tier);
      while (!spendRefined(state, tier, craftCost)) {
        tick(state);
        if (state.ticks > 10_000_000) throw new Error("sequential diagnostic runaway while crafting");
      }
      craftHours = hours(state);
    }

    if (tier === 8) {
      rows.push({
        tier: "T8",
        thresholdProfile: thresholdProfileName,
        buildingModel,
        craftHours,
        gateLevel: null,
        masteryGateHours: null,
        buildingReadyHours: null,
        transitionHours: hours(state),
        minHeroLevel: minimumHeroLevel(state),
        stocks: snapshotStocks(state, tier),
      });
      break;
    }

    const targetTier = (tier + 1) as 4 | 5 | 6 | 7 | 8;
    const gateLevel = thresholds[targetTier];
    while (!allHeroMasteriesAtLeast(state, gateLevel)) {
      tick(state);
      if (state.ticks > 10_000_000) throw new Error("sequential diagnostic runaway while waiting for mastery");
    }
    const masteryGateHours = hours(state);

    const buildingCost = buildingModel === "current" ? currentBuildingCost(targetTier) : trialBuildingCost(targetTier);
    if (buildingCost === null) {
      rows.push({
        tier: `T${tier}->T${targetTier}`,
        thresholdProfile: thresholdProfileName,
        buildingModel,
        craftHours,
        gateLevel,
        masteryGateHours,
        buildingReadyHours: null,
        transitionHours: null,
        minHeroLevel: minimumHeroLevel(state),
        stocks: snapshotStocks(state, tier),
      });
      break;
    }

    while (!spendRefined(state, tier, buildingCost)) {
      tick(state);
      if (state.ticks > 10_000_000) throw new Error("sequential diagnostic runaway while funding buildings");
    }
    const buildingReadyHours = hours(state);

    rows.push({
      tier: `T${tier}->T${targetTier}`,
      thresholdProfile: thresholdProfileName,
      buildingModel,
      craftHours,
      gateLevel,
      masteryGateHours,
      buildingReadyHours,
      transitionHours: buildingReadyHours,
      minHeroLevel: minimumHeroLevel(state),
      stocks: snapshotStocks(state, tier),
    });
  }

  return rows;
}

describe("sequential gathering / production economy diagnostic", () => {
  it("carries masteries and stocks across tiers and compares building curves", () => {
    const currentRows = (Object.keys(THRESHOLD_PROFILES) as Array<keyof typeof THRESHOLD_PROFILES>)
      .flatMap((profile) => runSequential(profile, "current"));
    const trialRows = (Object.keys(THRESHOLD_PROFILES) as Array<keyof typeof THRESHOLD_PROFILES>)
      .flatMap((profile) => runSequential(profile, "trial"));

    console.log("[GATHERING_PRODUCTION_SEQUENTIAL_CURRENT]");
    console.table(currentRows);
    console.log("[GATHERING_PRODUCTION_SEQUENTIAL_TRIAL]");
    console.table(trialRows);
    console.log("[GATHERING_PRODUCTION_SEQUENTIAL_JSON]", JSON.stringify({ currentRows, trialRows }, null, 2));

    expect(currentRows.length).toBeGreaterThan(0);
    expect(trialRows.length).toBeGreaterThan(0);
  });
});
