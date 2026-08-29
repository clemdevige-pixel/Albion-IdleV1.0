import {
  BLACK_MARKET_ARMOR_SLOT_TARGETS,
  BLACK_MARKET_BASE_RATE,
  BLACK_MARKET_CARGO_SLOT_LIMIT,
  BLACK_MARKET_DEMAND_BONUSES,
  BLACK_MARKET_DEMAND_COUNT,
  BLACK_MARKET_DEMAND_QUANTITY_BY_TIER,
  BLACK_MARKET_ROUTES,
  BLACK_MARKET_STACK_LIMIT,
  BLACK_MARKET_WEAPON_FAMILY_TARGETS,
  type BlackMarketRouteId,
} from "@game/data";
import { getDailyRotationId, getNextDailyResetAt } from "../time/daily-reset.js";
import type { EnchantmentLevel } from "../inventory/types.js";

export type BlackMarketTier = 4 | 5 | 6 | 7 | 8;
export type BlackMarketDemandTargetType = "weapon_family" | "armor_slot";

export interface BlackMarketCargoUnit {
  readonly instanceId: string;
  readonly itemId: string;
  readonly enchantment: EnchantmentLevel;
  readonly tier: BlackMarketTier;
  readonly economicValue: number;
  readonly weaponFamily?: string;
  readonly armorSlot?: string;
}

export interface BlackMarketDemand {
  readonly id: string;
  readonly targetType: BlackMarketDemandTargetType;
  readonly targetId: string;
  readonly tier: BlackMarketTier;
  readonly requiredQuantity: number;
  readonly fulfilledQuantity: number;
  readonly bonus: number;
}

export interface BlackMarketCargoLine {
  readonly itemId: string;
  readonly enchantment: EnchantmentLevel;
  readonly quantity: number;
  readonly economicValue: number;
  readonly normalBmValue: number;
  readonly demandBonusValue: number;
}

export interface BlackMarketConvoy {
  readonly id: string;
  readonly routeId: BlackMarketRouteId;
  readonly departedAt: number;
  readonly completesAt: number;
  readonly success: boolean;
  readonly payoutOnSuccess: number;
  readonly cargoEconomicValue: number;
  readonly cargoBmValue: number;
  readonly cargo: readonly BlackMarketCargoLine[];
}

export interface BlackMarketResult extends BlackMarketConvoy {
  readonly settledAt: number;
  readonly silverReceived: number;
}

export interface BlackMarketSnapshot {
  readonly rotationId: string;
  readonly nextResetAt: number;
  readonly demands: readonly BlackMarketDemand[];
  readonly activeConvoy: BlackMarketConvoy | null;
  readonly lastResult: BlackMarketResult | null;
}

export interface BlackMarketServicePorts {
  readonly commitCargo: (units: readonly BlackMarketCargoUnit[]) => boolean;
  readonly creditSilver: (amount: number) => boolean;
}

interface SavedState {
  rotationId: string;
  demands: BlackMarketDemand[];
  activeConvoy: BlackMarketConvoy | null;
  lastResult: BlackMarketResult | null;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne<T>(values: readonly T[], random: () => number): T {
  const value = values[Math.min(values.length - 1, Math.floor(random() * values.length))];
  if (value === undefined) throw new Error("Cannot pick from empty Black Market pool");
  return value;
}

function pickWeightedBonus(random: () => number): number {
  const total = BLACK_MARKET_DEMAND_BONUSES.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random() * total;
  for (const entry of BLACK_MARKET_DEMAND_BONUSES) {
    cursor -= entry.weight;
    if (cursor < 0) return entry.bonus;
  }
  return BLACK_MARKET_DEMAND_BONUSES[0].bonus;
}

function normalizeTiers(values: readonly number[]): BlackMarketTier[] {
  return [...new Set(values.filter((value): value is BlackMarketTier => (
    value === 4 || value === 5 || value === 6 || value === 7 || value === 8
  )))].sort((a, b) => a - b);
}

function generateDemands(rotationId: string, unlockedTiers: readonly number[]): BlackMarketDemand[] {
  const tiers = normalizeTiers(unlockedTiers);
  if (tiers.length === 0) return [];
  const random = randomFromSeed(`black_market_demands|${rotationId}|${tiers.join(",")}`);
  const targets = [
    ...BLACK_MARKET_WEAPON_FAMILY_TARGETS.map((targetId) => ({ targetType: "weapon_family" as const, targetId })),
    ...BLACK_MARKET_ARMOR_SLOT_TARGETS.map((targetId) => ({ targetType: "armor_slot" as const, targetId })),
  ];
  const demands: BlackMarketDemand[] = [];
  const used = new Set<string>();
  while (demands.length < BLACK_MARKET_DEMAND_COUNT) {
    const tier = pickOne(tiers, random);
    const target = pickOne(targets, random);
    const key = `${target.targetType}|${target.targetId}|${String(tier)}`;
    if (used.has(key)) continue;
    used.add(key);
    const range = BLACK_MARKET_DEMAND_QUANTITY_BY_TIER[tier];
    const requiredQuantity = range.min + Math.floor(random() * (range.max - range.min + 1));
    demands.push({
      id: `bm_${rotationId}_${String(demands.length)}_${key}`,
      targetType: target.targetType,
      targetId: target.targetId,
      tier,
      requiredQuantity,
      fulfilledQuantity: 0,
      bonus: pickWeightedBonus(random),
    });
  }
  return demands;
}

function demandMatches(demand: BlackMarketDemand, unit: BlackMarketCargoUnit): boolean {
  if (demand.tier !== unit.tier) return false;
  return demand.targetType === "weapon_family"
    ? unit.weaponFamily === demand.targetId
    : unit.armorSlot === demand.targetId;
}

export class BlackMarketService {
  readonly providerId = "black_market";
  private state: SavedState = { rotationId: "", demands: [], activeConvoy: null, lastResult: null };

  constructor(private readonly ports: BlackMarketServicePorts) {}

  isUnlocked(hasUnlock: (unlockId: string) => boolean): boolean {
    return hasUnlock("black_market:unlocked");
  }

  getSnapshot(nowMs: number, unlockedTiers: readonly number[]): BlackMarketSnapshot {
    this.ensureRotation(nowMs, unlockedTiers);
    this.settleIfComplete(nowMs);
    return {
      rotationId: this.state.rotationId,
      nextResetAt: getNextDailyResetAt(nowMs),
      demands: this.state.demands.map((entry) => ({ ...entry })),
      activeConvoy: this.state.activeConvoy === null ? null : { ...this.state.activeConvoy },
      lastResult: this.state.lastResult === null ? null : { ...this.state.lastResult },
    };
  }

  startConvoy(
    units: readonly BlackMarketCargoUnit[],
    routeId: BlackMarketRouteId,
    nowMs: number,
    unlockedTiers: readonly number[],
  ): boolean {
    this.ensureRotation(nowMs, unlockedTiers);
    this.settleIfComplete(nowMs);
    if (this.state.activeConvoy !== null || units.length === 0) return false;
    const route = BLACK_MARKET_ROUTES.find((entry) => entry.id === routeId);
    if (route === undefined) return false;

    const groups = new Map<string, BlackMarketCargoUnit[]>();
    for (const unit of units) {
      if (!Number.isSafeInteger(unit.economicValue) || unit.economicValue <= 0) return false;
      const key = `${unit.itemId}|${String(unit.enchantment)}`;
      const group = groups.get(key) ?? [];
      group.push(unit);
      groups.set(key, group);
    }
    if (groups.size > BLACK_MARKET_CARGO_SLOT_LIMIT) return false;
    if ([...groups.values()].some((group) => group.length > BLACK_MARKET_STACK_LIMIT)) return false;

    const demandProgress = this.state.demands.map((entry) => ({ ...entry }));
    let cargoEconomicValue = 0;
    let cargoBmValue = 0;
    const lineMap = new Map<string, { itemId: string; enchantment: EnchantmentLevel; quantity: number; economicValue: number; normalBmValue: number; demandBonusValue: number }>();

    for (const unit of units) {
      cargoEconomicValue += unit.economicValue;
      const normalBmValue = unit.economicValue * BLACK_MARKET_BASE_RATE;
      let demandBonusValue = 0;
      const demand = demandProgress.find((entry) => (
        entry.fulfilledQuantity < entry.requiredQuantity && demandMatches(entry, unit)
      ));
      if (demand !== undefined) {
        demandBonusValue = normalBmValue * demand.bonus;
        demand.fulfilledQuantity += 1;
      }
      cargoBmValue += normalBmValue + demandBonusValue;
      const key = `${unit.itemId}|${String(unit.enchantment)}`;
      const line = lineMap.get(key) ?? {
        itemId: unit.itemId,
        enchantment: unit.enchantment,
        quantity: 0,
        economicValue: 0,
        normalBmValue: 0,
        demandBonusValue: 0,
      };
      line.quantity += 1;
      line.economicValue += unit.economicValue;
      line.normalBmValue += normalBmValue;
      line.demandBonusValue += demandBonusValue;
      lineMap.set(key, line);
    }

    if (!this.ports.commitCargo(units)) return false;

    const seed = `${this.state.rotationId}|${String(nowMs)}|${routeId}|${units.map((unit) => unit.instanceId).sort().join(",")}`;
    const success = randomFromSeed(seed)() < route.successChance;
    this.state.demands = demandProgress;
    this.state.activeConvoy = {
      id: `convoy_${hashString(seed).toString(16)}`,
      routeId,
      departedAt: nowMs,
      completesAt: nowMs + route.durationMs,
      success,
      payoutOnSuccess: Math.round(cargoBmValue * route.payoutMultiplier),
      cargoEconomicValue: Math.round(cargoEconomicValue),
      cargoBmValue: Math.round(cargoBmValue),
      cargo: [...lineMap.values()].map((entry) => ({
        ...entry,
        economicValue: Math.round(entry.economicValue),
        normalBmValue: Math.round(entry.normalBmValue),
        demandBonusValue: Math.round(entry.demandBonusValue),
      })),
    };
    this.state.lastResult = null;
    return true;
  }

  dismissResult(): void {
    this.state.lastResult = null;
  }

  private ensureRotation(nowMs: number, unlockedTiers: readonly number[]): void {
    const rotationId = getDailyRotationId(nowMs);
    if (this.state.rotationId === rotationId) return;
    this.state.rotationId = rotationId;
    this.state.demands = generateDemands(rotationId, unlockedTiers);
  }

  private settleIfComplete(nowMs: number): void {
    const convoy = this.state.activeConvoy;
    if (convoy === null || nowMs < convoy.completesAt) return;
    const silverReceived = convoy.success ? convoy.payoutOnSuccess : 0;
    if (silverReceived > 0 && !this.ports.creditSilver(silverReceived)) return;
    this.state.lastResult = { ...convoy, settledAt: nowMs, silverReceived };
    this.state.activeConvoy = null;
  }

  save(): unknown {
    return {
      rotationId: this.state.rotationId,
      demands: this.state.demands.map((entry) => ({ ...entry })),
      activeConvoy: this.state.activeConvoy === null ? null : { ...this.state.activeConvoy, cargo: this.state.activeConvoy.cargo.map((entry) => ({ ...entry })) },
      lastResult: this.state.lastResult === null ? null : { ...this.state.lastResult, cargo: this.state.lastResult.cargo.map((entry) => ({ ...entry })) },
    } satisfies SavedState;
  }

  load(data: unknown): void {
    if (data === null || typeof data !== "object") {
      this.state = { rotationId: "", demands: [], activeConvoy: null, lastResult: null };
      return;
    }
    const candidate = data as Partial<SavedState>;
    if (typeof candidate.rotationId !== "string" || !Array.isArray(candidate.demands)) {
      this.state = { rotationId: "", demands: [], activeConvoy: null, lastResult: null };
      return;
    }
    this.state = {
      rotationId: candidate.rotationId,
      demands: candidate.demands.map((entry) => ({ ...entry })),
      activeConvoy: candidate.activeConvoy ?? null,
      lastResult: candidate.lastResult ?? null,
    };
  }
}
