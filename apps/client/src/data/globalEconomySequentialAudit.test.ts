import { describe, expect, it } from "vitest";
import {
  ENCHANTMENT_RECIPES,
  GATHERING_MASTERY_XP,
  getEncounterRewards,
  scaleEnchantmentRecipe,
} from "@game/gameplay";
import {
  getIslandLevelDefinition,
  getIslandOperationalLevelDefinition,
} from "@game/data";
import {
  getHeroGatheringXpForTier,
  getHeroGatheringXpFromWorkerForTier,
  getRequiredGatheringMasteryForTier,
  getWorkerGatheringXpForTier,
} from "./progressionContentCatalog.js";
import {
  getProductionTierRules,
  type ProductionTier,
} from "./productionFamilyCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES } from "./refiningRecipes.js";
import {
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
} from "./itemContentCatalog.js";
import {
  getWorldZonePlacement,
  WORLD_ZONE_IDS,
} from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { getExpectedEnchantmentShardsPerSegment } from "./enchantmentShardTtkBenchmark.js";

const TICK_SECONDS = 0.5;
const MAX_TICKS = 10_000_000;
const FAMILIES = ["wood", "ore", "hide", "fiber"] as const;
type Family = (typeof FAMILIES)[number];
type TargetTier = 4 | 5 | 6 | 7 | 8;
type SourceTier = 3 | 4 | 5 | 6 | 7;
type BenchmarkEnchantment = 0 | 1 | 2 | 3;

const WEAPON_SUFFIXES = [
  "sword_broadsword",
  "bow_longbow",
  "staff_infernal",
  "gloves_spiked_gauntlets",
  "dagger_pair",
] as const;

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

interface TransitionDef {
  label: string;
  sourceTier: SourceTier;
  targetTier: TargetTier;
  enchantment: BenchmarkEnchantment;
  mastery: number;
  candidateZones: readonly string[];
}

const TRANSITIONS: readonly TransitionDef[] = [
  { label: "T3->T4", sourceTier: 3, targetTier: 4, enchantment: 0, mastery: 10, candidateZones: [WORLD_ZONE_IDS.forest, WORLD_ZONE_IDS.swamp, WORLD_ZONE_IDS.highland, WORLD_ZONE_IDS.steppe] },
  { label: "T4->T5", sourceTier: 4, targetTier: 5, enchantment: 3, mastery: 23, candidateZones: [WORLD_ZONE_IDS.mountain, WORLD_ZONE_IDS.amberwood] },
  { label: "T5->T6", sourceTier: 5, targetTier: 6, enchantment: 3, mastery: 36, candidateZones: [WORLD_ZONE_IDS.ironveil, WORLD_ZONE_IDS.cinderwood] },
  { label: "T6->T7", sourceTier: 6, targetTier: 7, enchantment: 3, mastery: 46, candidateZones: [WORLD_ZONE_IDS.ashenpeak, WORLD_ZONE_IDS.bloodwood] },
  { label: "T7->T8", sourceTier: 7, targetTier: 8, enchantment: 3, mastery: 56, candidateZones: [WORLD_ZONE_IDS.doompeak, WORLD_ZONE_IDS.blackwood] },
] as const;

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

function assertNotRunaway(state: SimulationState, phase: string): void {
  if (state.ticks > MAX_TICKS) throw new Error(`global economy audit runaway during ${phase}`);
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
  if (!canProduceRefined(data, previousTier, missing)) return findBlockingGatherTier(data, previousTier, missing);
  return targetTier;
}

function switchHeroGatherTier(data: FamilyState, tier: ProductionTier): void {
  if (data.heroGatherTier === tier) return;
  data.heroGatherTier = tier;
  data.heroRemaining = heroGatherTicks(tier, data.heroXp);
}

function switchWorkerGatherTier(data: FamilyState, tier: ProductionTier): void {
  if (data.workerGatherTier === tier) return;
  data.workerGatherTier = tier;
  data.workerRemaining = workerGatherTicks(tier, data.workerXp);
}

function tick(state: SimulationState, demandTier = state.tier, demandCosts?: Record<Family, number>): void {
  state.ticks += 1;
  for (const family of FAMILIES) {
    const data = state.families[family];
    const required = demandCosts?.[family] ?? 0;
    const desiredTier = required > 0 ? findBlockingGatherTier(data, demandTier, required) : state.tier;
    data.workerRemaining -= 1;
    if (data.workerRemaining <= 0) {
      data.raw[data.workerGatherTier] += 1;
      data.workerXp += getWorkerGatheringXpForTier(data.workerGatherTier);
      data.heroXp += getHeroGatheringXpFromWorkerForTier(data.workerGatherTier);
      switchWorkerGatherTier(data, desiredTier);
      data.workerRemaining = workerGatherTicks(data.workerGatherTier, data.workerXp);
    }
  }
  const activeFamily = FAMILIES[state.activeFamilyIndex] ?? "wood";
  const active = state.families[activeFamily];
  const activeRequired = demandCosts?.[activeFamily] ?? 0;
  const desiredTier = activeRequired > 0 ? findBlockingGatherTier(active, demandTier, activeRequired) : state.tier;
  active.heroRemaining -= 1;
  if (active.heroRemaining <= 0) {
    active.raw[active.heroGatherTier] += 1;
    active.heroXp += getHeroGatheringXpForTier(active.heroGatherTier);
    switchHeroGatherTier(active, desiredTier);
    active.heroRemaining = heroGatherTicks(active.heroGatherTier, active.heroXp);
    state.activeFamilyIndex = (state.activeFamilyIndex + 1) % FAMILIES.length;
  }
}

function spendRefined(state: SimulationState, tier: ProductionTier, costs: Record<Family, number>): boolean {
  if (!FAMILIES.every((family) => canProduceRefined(state.families[family], tier, costs[family]))) return false;
  for (const family of FAMILIES) {
    if (!produceRefined(state.families[family], tier, costs[family])) return false;
    state.families[family].refined[tier] -= costs[family];
  }
  return true;
}

function buildFlexibleWorkshopAllocation(state: SimulationState, tier: ProductionTier, total: number): Record<Family, number> | null {
  const capacities = Object.fromEntries(FAMILIES.map((family) => [family, maxProducibleRefined(state.families[family], tier)])) as Record<Family, number>;
  const contributors = [...FAMILIES].filter((family) => capacities[family] > 0).sort((a, b) => capacities[b] - capacities[a]);
  if (contributors.length < 3) return null;
  const allocation: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const family of contributors.slice(0, 3)) allocation[family] = 1;
  let remaining = total - 3;
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

function workshopFallbackDemand(total: number): Record<Family, number> {
  const base = Math.floor(total / FAMILIES.length);
  let remainder = total % FAMILIES.length;
  return Object.fromEntries(FAMILIES.map((family) => {
    const quantity = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return [family, quantity];
  })) as Record<Family, number>;
}

function familyForRefinedItem(itemId: string): Family | undefined {
  if (itemId.includes("plank")) return "wood";
  if (itemId.includes("bar")) return "ore";
  if (itemId.includes("leather")) return "hide";
  if (itemId.includes("cloth")) return "fiber";
  return undefined;
}

function representativeItemIds(tier: ProductionTier): readonly string[] {
  if (tier === 3) return ["item_weapon_bow_t3_longbow", "item_iron_helmet", "item_leather_armor", "item_leather_boots"];
  return [
    `item_weapon_bow_t${String(tier)}_longbow`,
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
  ];
}

function representativeSetCost(tier: ProductionTier): Record<Family, number> {
  const costs: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const itemId of representativeItemIds(tier)) {
    const recipe = EQUIPMENT_CRAFT_RECIPES.find((candidate) => candidate.outputItemId === itemId);
    if (recipe === undefined) throw new Error(`Missing craft recipe for ${itemId}`);
    for (const requirement of recipe.requirements) {
      if (!requirement.itemId.startsWith("item_refined_")) continue;
      const family = familyForRefinedItem(requirement.itemId);
      if (family !== undefined) costs[family] += requirement.quantity;
    }
  }
  return costs;
}

function enchantmentPackageCost(tier: TargetTier) {
  let silver = 0;
  let shards = 0;
  const refined: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const itemId of representativeItemIds(tier)) {
    const info = resolveEnchantmentItemInfo(itemId);
    if (info === undefined || !info.enchantable) continue;
    for (const level of [1, 2, 3] as const) {
      const scaled = scaleEnchantmentRecipe(ENCHANTMENT_RECIPES[level], tier, info.costCategory, info.craftMaterials);
      silver += scaled.silverCost;
      for (const material of scaled.materials) {
        if (material.itemId.includes("enchantment_shard")) shards += material.quantity;
        const family = familyForRefinedItem(material.itemId);
        if (family !== undefined) refined[family] += material.quantity;
      }
    }
  }
  return { silver, shards, refined };
}

function hours(state: SimulationState): number {
  return Number(((state.ticks * TICK_SECONDS) / 3600).toFixed(2));
}

function minimumHeroLevel(state: SimulationState): number {
  return Math.min(...FAMILIES.map((family) => masteryLevelFromXp(state.families[family].heroXp)));
}

function setAllGatherTiers(state: SimulationState, tier: ProductionTier): void {
  for (const family of FAMILIES) {
    switchHeroGatherTier(state.families[family], tier);
    switchWorkerGatherTier(state.families[family], tier);
  }
}

function snapshotStocks(state: SimulationState, tier: ProductionTier): string {
  return FAMILIES.map((family) => `${family}:${state.families[family].raw[tier]}r/${state.families[family].refined[tier]}f`).join(" ");
}

function weaponItemId(tier: SourceTier, suffix: (typeof WEAPON_SUFFIXES)[number]): string {
  const [family, specialization] = suffix.split("_");
  if (family === "staff") return `item_weapon_staff_t${String(tier)}_${specialization}`;
  if (family === "gloves") return `item_weapon_gloves_t${String(tier)}_spiked_gauntlets`;
  if (family === "dagger") return `item_weapon_dagger_t${String(tier)}_pair`;
  return `item_weapon_${family}_t${String(tier)}_${specialization}`;
}

function equipmentFor(tier: SourceTier, weaponId: string): readonly string[] {
  const items: string[] = tier === 3
    ? ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"]
    : [`item_helmet_t${String(tier)}_reinforced`, `item_armor_t${String(tier)}_leather`, `item_boots_t${String(tier)}_leather`, "item_traveler_cape"];
  if (resolveEquipmentInfo(weaponId)?.handling === "one_handed") items.push(tier === 3 ? "item_shield_t3_reinforced" : `item_shield_t${String(tier)}_reinforced`);
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

function bestFarm(transition: TransitionDef, weaponId: string) {
  let bestSilver = 0;
  let bestShards = 0;
  for (const zoneDefId of transition.candidateZones) {
    for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
      const result = runCombatRuntimeBenchmark({
        label: `${transition.label}_${weaponId}_${zoneDefId}_${String(segmentIndex + 1)}`,
        weaponItemId: weaponId,
        zoneDefId: zoneDefId as never,
        segmentIndex,
        equipmentItemIds: equipmentFor(transition.sourceTier, weaponId),
        masteryLevel: transition.mastery,
        enchantment: transition.enchantment,
        useHealthPotions: false,
      });
      if (!result.clear || result.seconds <= 0) continue;
      bestSilver = Math.max(bestSilver, segmentSilver(zoneDefId, segmentIndex) * 3600 / result.seconds);
      const expected = getExpectedEnchantmentShardsPerSegment(zoneDefId as never, segmentIndex);
      bestShards = Math.max(bestShards, expected * 3600 / result.seconds);
    }
  }
  return { bestSilver, bestShards };
}

function runProductionModel() {
  const state = createState();
  const rows: Array<{ transition: string; economyHours: number; sourceTier: SourceTier; targetTier: TargetTier; stocks: string; craftCost: Record<Family, number> }> = [];
  let previousHours = 0;
  for (const transition of TRANSITIONS) {
    const tier = transition.sourceTier;
    state.tier = tier;
    setAllGatherTiers(state, tier);
    if (tier >= 4) {
      const craftCost = representativeSetCost(tier);
      while (!spendRefined(state, tier, craftCost)) {
        tick(state, tier, craftCost);
        assertNotRunaway(state, `T${String(tier)} craft`);
      }
    }
    const gateLevel = getRequiredGatheringMasteryForTier(transition.targetTier);
    while (minimumHeroLevel(state) < gateLevel) {
      tick(state);
      assertNotRunaway(state, `${transition.label} mastery`);
    }
    const sourceLevel = tier - 2;
    const monoDef = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel);
    const monoRequirement = monoDef?.upgradeToNext?.requirements[0]?.quantity;
    if (monoRequirement === undefined) throw new Error(`Missing mono material cost for ${transition.label}`);
    const monoCosts: Record<Family, number> = { wood: monoRequirement * 2, ore: monoRequirement * 2, hide: monoRequirement * 2, fiber: monoRequirement * 2 };
    while (!spendRefined(state, tier, monoCosts)) {
      tick(state, tier, monoCosts);
      assertNotRunaway(state, `${transition.label} mono buildings`);
    }
    const workshopDef = getIslandOperationalLevelDefinition("workshop", sourceLevel);
    const workshopTotal = workshopDef?.upgradeToNext?.flexibleRequirement?.totalQuantity;
    if (workshopTotal === undefined) throw new Error(`Missing workshop material cost for ${transition.label}`);
    let allocation = buildFlexibleWorkshopAllocation(state, tier, workshopTotal);
    while (allocation === null || !spendRefined(state, tier, allocation)) {
      const demand = allocation ?? workshopFallbackDemand(workshopTotal);
      tick(state, tier, demand);
      assertNotRunaway(state, `${transition.label} workshop`);
      allocation = buildFlexibleWorkshopAllocation(state, tier, workshopTotal);
    }
    const cumulativeHours = hours(state);
    rows.push({
      transition: transition.label,
      economyHours: Number((cumulativeHours - previousHours).toFixed(2)),
      sourceTier: tier,
      targetTier: transition.targetTier,
      stocks: snapshotStocks(state, tier),
      craftCost: representativeSetCost(tier),
    });
    previousHours = cumulativeHours;
  }
  return rows;
}

function round1(value: number): number { return Number(value.toFixed(1)); }
function round2(value: number): number { return Number(value.toFixed(2)); }

describe("global sequential economy audit", () => {
  it("combines production, infrastructure, Silver and enchantment costs from live sources", () => {
    const productionRows = runProductionModel();
    const rows = TRANSITIONS.map((transition) => {
      const production = productionRows.find((row) => row.transition === transition.label);
      if (production === undefined) throw new Error(`Missing production row ${transition.label}`);
      const farms = WEAPON_SUFFIXES.map((suffix) => bestFarm(transition, weaponItemId(transition.sourceTier, suffix)));
      const avgSilverPerHour = farms.reduce((sum, farm) => sum + farm.bestSilver, 0) / farms.length;
      const avgShardsPerHour = farms.reduce((sum, farm) => sum + farm.bestShards, 0) / farms.length;
      const sourceLevel = transition.sourceTier - 2;
      const islandSilver = getIslandLevelDefinition(sourceLevel + 1)?.upgradeCost?.silver ?? 0;
      const monoSilver = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel)?.upgradeToNext?.silver ?? 0;
      const workshopSilver = getIslandOperationalLevelDefinition("workshop", sourceLevel)?.upgradeToNext?.silver ?? 0;
      const infrastructureSilver = islandSilver + monoSilver * 8 + workshopSilver;
      const enchant = enchantmentPackageCost(transition.targetTier);
      return {
        transition: transition.label,
        productionHours: production.economyHours,
        infrastructureSilver,
        avgSilverPerHour: round1(avgSilverPerHour),
        infrastructureSilverHours: avgSilverPerHour > 0 ? round2(infrastructureSilver / avgSilverPerHour) : null,
        enchantToPoint3Silver: enchant.silver,
        totalSilverWithEnchant: infrastructureSilver + enchant.silver,
        totalSilverHours: avgSilverPerHour > 0 ? round2((infrastructureSilver + enchant.silver) / avgSilverPerHour) : null,
        enchantToPoint3Shards: enchant.shards,
        avgShardsPerHour: round1(avgShardsPerHour),
        shardFarmHours: avgShardsPerHour > 0 ? round2(enchant.shards / avgShardsPerHour) : null,
        enchantRefined: FAMILIES.map((family) => `${family}:${enchant.refined[family]}`).join(" "),
        representativeCraft: FAMILIES.map((family) => `${family}:${production.craftCost[family]}`).join(" "),
        sourceTierStocks: production.stocks,
      };
    });

    console.log("[GLOBAL_ECONOMY_SEQUENTIAL_AUDIT]");
    console.table(rows);
    console.log("[GLOBAL_ECONOMY_SEQUENTIAL_AUDIT_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TRANSITIONS.length);
    expect(rows.every((row) => row.infrastructureSilver > 0)).toBe(true);
    expect(rows.every((row) => row.avgSilverPerHour > 0)).toBe(true);
    expect(rows.every((row) => row.avgShardsPerHour > 0)).toBe(true);
  });
});