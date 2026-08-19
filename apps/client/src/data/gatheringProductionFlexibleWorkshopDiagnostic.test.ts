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
type TargetTier = 4 | 5 | 6 | 7 | 8;

const GATHERING_UNLOCK_LEVEL = { 4: 3, 5: 7, 6: 11, 7: 18, 8: 25 } as const satisfies Record<TargetTier, number>;
const MONO_BUILDING_COST = { 4: 15, 5: 40, 6: 70, 7: 110, 8: 160 } as const satisfies Record<TargetTier, number>;
const WORKSHOP_MIN_DISTINCT_FAMILIES = 3;

interface FamilyState {
  heroXp: number;
  workerXp: number;
  heroRemaining: number;
  workerRemaining: number;
  heroGatherTier: ProductionTier;
  workerGatherTier: ProductionTier;
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
    heroGatherTier: 3,
    workerGatherTier: 3,
    raw: emptyTierRecord(),
    refined: emptyTierRecord(),
  }])) as Record<Family, FamilyState>;
  return { tier: 3, ticks: 0, activeFamilyIndex: 0, families };
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

function maxProducibleRefined(data: FamilyState, tier: ProductionTier): number {
  let low = 0;
  let high = 1;
  while (high < 100_000 && canProduceRefined(data, tier, high)) high *= 2;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (canProduceRefined(data, tier, mid)) low = mid;
    else high = mid;
  }
  return low;
}

function findBlockingGatherTier(data: FamilyState, targetTier: ProductionTier, amount: number): ProductionTier {
  const missing = Math.max(0, amount - data.refined[targetTier]);
  if (missing <= 0 || targetTier === 3) return targetTier;
  const previousTier = (targetTier - 1) as ProductionTier;
  if (!canProduceRefined(data, previousTier, missing)) {
    return findBlockingGatherTier(data, previousTier, missing);
  }
  return targetTier;
}

function setGatherTier(data: FamilyState, tier: ProductionTier): void {
  if (data.heroGatherTier !== tier) {
    data.heroGatherTier = tier;
    data.heroRemaining = heroGatherTicks(tier, data.heroXp);
  }
  if (data.workerGatherTier !== tier) {
    data.workerGatherTier = tier;
    data.workerRemaining = workerGatherTicks(tier, data.workerXp);
  }
}

function tick(state: SimulationState, demandTier = state.tier, demandCosts?: Record<Family, number>): void {
  state.ticks += 1;
  for (const family of FAMILIES) {
    const data = state.families[family];
    const required = demandCosts?.[family] ?? 0;
    setGatherTier(data, required > 0 ? findBlockingGatherTier(data, demandTier, required) : state.tier);
    data.workerRemaining -= 1;
    if (data.workerRemaining <= 0) {
      data.raw[data.workerGatherTier] += 1;
      data.workerXp += getWorkerGatheringXpForTier(data.workerGatherTier);
      data.heroXp += getHeroGatheringXpFromWorkerForTier(data.workerGatherTier);
      data.workerRemaining = workerGatherTicks(data.workerGatherTier, data.workerXp);
    }
  }

  const activeFamily = FAMILIES[state.activeFamilyIndex] ?? "wood";
  const active = state.families[activeFamily];
  active.heroRemaining -= 1;
  if (active.heroRemaining <= 0) {
    active.raw[active.heroGatherTier] += 1;
    active.heroXp += getHeroGatheringXpForTier(active.heroGatherTier);
    active.heroRemaining = heroGatherTicks(active.heroGatherTier, active.heroXp);
    state.activeFamilyIndex = (state.activeFamilyIndex + 1) % FAMILIES.length;
  }
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

function buildFlexibleWorkshopAllocation(state: SimulationState, tier: ProductionTier, total: number): Record<Family, number> | null {
  const capacities = Object.fromEntries(FAMILIES.map((family) => [family, maxProducibleRefined(state.families[family], tier)])) as Record<Family, number>;
  const contributors = [...FAMILIES]
    .filter((family) => capacities[family] > 0)
    .sort((a, b) => capacities[b] - capacities[a]);
  if (contributors.length < WORKSHOP_MIN_DISTINCT_FAMILIES) return null;

  const allocation: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const family of contributors.slice(0, WORKSHOP_MIN_DISTINCT_FAMILIES)) allocation[family] = 1;
  let remaining = total - WORKSHOP_MIN_DISTINCT_FAMILIES;

  while (remaining > 0) {
    const candidate = [...contributors]
      .filter((family) => allocation[family] < capacities[family])
      .sort((a, b) => (capacities[b] - allocation[b]) - (capacities[a] - allocation[a]))[0];
    if (candidate === undefined) return null;
    allocation[candidate] += 1;
    remaining -= 1;
  }
  return allocation;
}

function representativeSetCost(tier: ProductionTier): Record<Family, number> {
  if (tier === 3) return { wood: 6, ore: 4, hide: 10, fiber: 5 };
  const index = tier - 4;
  return { wood: 6, ore: 6 + index, hide: 14 + index * 3, fiber: 7 + index * 2 };
}

function hours(state: SimulationState): number {
  return Number(((state.ticks * TICK_SECONDS) / 3600).toFixed(2));
}

function minimumHeroLevel(state: SimulationState): number {
  return Math.min(...FAMILIES.map((family) => masteryLevelFromXp(state.families[family].heroXp)));
}

function snapshotStocks(state: SimulationState, tier: ProductionTier): string {
  return FAMILIES.map((family) => `${family}:${state.families[family].raw[tier]}r/${state.families[family].refined[tier]}f`).join(" ");
}

function runValidatedModel() {
  const state = createState();
  const rows: Array<Record<string, string | number | null>> = [];

  for (const tier of [3, 4, 5, 6, 7, 8] as const) {
    state.tier = tier;
    for (const family of FAMILIES) setGatherTier(state.families[family], tier);

    let craftHours: number | null = null;
    if (tier >= 4) {
      const craftCost = representativeSetCost(tier);
      while (!spendRefined(state, tier, craftCost)) tick(state, tier, craftCost);
      craftHours = hours(state);
    }

    if (tier === 8) {
      rows.push({ tier: "T8", craftHours, gateLevel: null, masteryGateHours: null, monoBuildingsReadyHours: null, workshopReadyHours: null, transitionHours: hours(state), minHeroLevel: minimumHeroLevel(state), workshopAllocation: "-", stocks: snapshotStocks(state, tier) });
      break;
    }

    const targetTier = (tier + 1) as TargetTier;
    const gateLevel = GATHERING_UNLOCK_LEVEL[targetTier];
    while (minimumHeroLevel(state) < gateLevel) tick(state);
    const masteryGateHours = hours(state);

    const mono = MONO_BUILDING_COST[targetTier];
    const monoCosts: Record<Family, number> = { wood: mono * 2, ore: mono * 2, hide: mono * 2, fiber: mono * 2 };
    while (!spendRefined(state, tier, monoCosts)) tick(state, tier, monoCosts);
    const monoBuildingsReadyHours = hours(state);

    let workshopAllocation = buildFlexibleWorkshopAllocation(state, tier, mono);
    while (workshopAllocation === null || !spendRefined(state, tier, workshopAllocation)) {
      const demand = workshopAllocation ?? { wood: 1, ore: 1, hide: 1, fiber: 1 };
      tick(state, tier, demand);
      workshopAllocation = buildFlexibleWorkshopAllocation(state, tier, mono);
    }
    const workshopReadyHours = hours(state);

    rows.push({
      tier: `T${tier}->T${targetTier}`,
      craftHours,
      gateLevel,
      masteryGateHours,
      monoBuildingsReadyHours,
      workshopReadyHours,
      transitionHours: workshopReadyHours,
      minHeroLevel: minimumHeroLevel(state),
      workshopAllocation: FAMILIES.map((family) => `${family}:${workshopAllocation?.[family] ?? 0}`).join(" "),
      stocks: snapshotStocks(state, tier),
    });
  }
  return rows;
}

describe("validated gathering / flexible workshop economy diagnostic", () => {
  it("measures sequential T3-T8 pacing with a three-family flexible workshop", () => {
    const rows = runValidatedModel();
    console.log("[GATHERING_PRODUCTION_FLEXIBLE_WORKSHOP_VALIDATION]");
    console.table(rows);
    console.log("[GATHERING_PRODUCTION_FLEXIBLE_WORKSHOP_VALIDATION_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 5).every((row) => typeof row.transitionHours === "number")).toBe(true);
  });
});
