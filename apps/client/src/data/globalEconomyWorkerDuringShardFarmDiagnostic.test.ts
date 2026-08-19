import { describe, expect, it } from "vitest";
import { ENCHANTMENT_RECIPES, GATHERING_MASTERY_XP, scaleEnchantmentRecipe } from "@game/gameplay";
import { getIslandOperationalLevelDefinition } from "@game/data";
import {
  getHeroGatheringXpForTier,
  getHeroGatheringXpFromWorkerForTier,
  getRequiredGatheringMasteryForTier,
  getWorkerGatheringXpForTier,
} from "./progressionContentCatalog.js";
import { getProductionTierRules, type ProductionTier } from "./productionFamilyCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES } from "./refiningRecipes.js";
import { resolveEnchantmentItemInfo, resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { getExpectedEnchantmentShardsPerSegment } from "./enchantmentShardTtkBenchmark.js";

const TICK_SECONDS = 0.5;
const MAX_TICKS = 12_000_000;
const FAMILIES = ["wood", "ore", "hide", "fiber"] as const;
type Family = (typeof FAMILIES)[number];
type TargetTier = 4 | 5 | 6 | 7 | 8;
type EquipmentTier = 3 | TargetTier;
type Enchantment = 0 | 1 | 2 | 3;

const WEAPONS = ["sword_broadsword", "bow_longbow", "staff_infernal", "gloves_spiked_gauntlets", "dagger_pair"] as const;
const ZONES: Readonly<Record<TargetTier, readonly string[]>> = {
  4: [WORLD_ZONE_IDS.steppe, WORLD_ZONE_IDS.mountain],
  5: [WORLD_ZONE_IDS.amberwood, WORLD_ZONE_IDS.gloamfen, WORLD_ZONE_IDS.stormwatch, WORLD_ZONE_IDS.sunscar, WORLD_ZONE_IDS.ironveil],
  6: [WORLD_ZONE_IDS.cinderwood, WORLD_ZONE_IDS.rotfen, WORLD_ZONE_IDS.thundercrag, WORLD_ZONE_IDS.emberwind, WORLD_ZONE_IDS.ashenpeak],
  7: [WORLD_ZONE_IDS.bloodwood, WORLD_ZONE_IDS.dreadfen, WORLD_ZONE_IDS.redspire, WORLD_ZONE_IDS.crimsonSteppe, WORLD_ZONE_IDS.doompeak],
  8: [WORLD_ZONE_IDS.blackwood, WORLD_ZONE_IDS.shadowfen, WORLD_ZONE_IDS.obsidianHighlands, WORLD_ZONE_IDS.duskfallSteppe, WORLD_ZONE_IDS.blackspire],
};
const ENTRY_MASTERY: Readonly<Record<TargetTier, number>> = { 4: 16, 5: 23, 6: 36, 7: 46, 8: 56 };

interface FamilyState {
  heroXp: number;
  workerXp: number;
  heroRemaining: number;
  workerRemaining: number;
  heroTier: ProductionTier;
  workerTier: ProductionTier;
  raw: Record<ProductionTier, number>;
  refined: Record<ProductionTier, number>;
}
interface State {
  tier: ProductionTier;
  ticks: number;
  activeFamily: number;
  families: Record<Family, FamilyState>;
}

function emptyTiers(): Record<ProductionTier, number> { return { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }; }
function masteryLevel(xp: number): number {
  let remaining = Math.max(0, xp);
  let level = 0;
  for (const cost of GATHERING_MASTERY_XP) { if (remaining < cost) break; remaining -= cost; level += 1; }
  return Math.min(100, level);
}
function workerLevel(xp: number): number { return Math.min(100, Math.floor(Math.sqrt(Math.max(0, xp) / 100))); }
function heroTicks(tier: ProductionTier, xp: number): number {
  const rules = getProductionTierRules(tier);
  return Math.max(1, Math.ceil(rules.gatheringBaseTicks * rules.gatheringToolSpeedModifier * Math.max(0.5, 1 - masteryLevel(xp) * 0.005)));
}
function workerTicks(tier: ProductionTier, xp: number): number {
  const rules = getProductionTierRules(tier);
  return Math.max(1, Math.ceil(60 / Math.max(0.01, rules.workerSpeedModifier * (1 + workerLevel(xp) * 0.005))));
}
function createState(): State {
  const families = Object.fromEntries(FAMILIES.map((family) => [family, {
    heroXp: 0, workerXp: 0, heroRemaining: heroTicks(3, 0), workerRemaining: workerTicks(3, 0),
    heroTier: 3, workerTier: 3, raw: emptyTiers(), refined: emptyTiers(),
  }])) as Record<Family, FamilyState>;
  return { tier: 3, ticks: 0, activeFamily: 0, families };
}
function canProduce(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  const raw = { ...data.raw }; const refined = { ...data.refined };
  const ensure = (t: ProductionTier, need: number): boolean => {
    if (refined[t] >= need) return true;
    const missing = need - refined[t];
    if (t === 3) { const rawNeed = missing * 4; if (raw[3] < rawNeed) return false; raw[3] -= rawNeed; refined[3] += missing; return true; }
    const prev = (t - 1) as ProductionTier;
    if (!ensure(prev, missing)) return false;
    const rawNeed = missing * 2; if (raw[t] < rawNeed) return false;
    raw[t] -= rawNeed; refined[prev] -= missing; refined[t] += missing; return true;
  };
  return ensure(tier, amount);
}
function produce(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  if (data.refined[tier] >= amount) return true;
  const missing = amount - data.refined[tier];
  if (tier === 3) { const rawNeed = missing * 4; if (data.raw[3] < rawNeed) return false; data.raw[3] -= rawNeed; data.refined[3] += missing; return true; }
  const prev = (tier - 1) as ProductionTier;
  if (!produce(data, prev, missing)) return false;
  const rawNeed = missing * 2; if (data.raw[tier] < rawNeed) return false;
  data.raw[tier] -= rawNeed; data.refined[prev] -= missing; data.refined[tier] += missing; return true;
}
function maxProducible(data: FamilyState, tier: ProductionTier): number {
  let low = 0; let high = 1;
  while (high < 100_000 && canProduce(data, tier, high)) high *= 2;
  while (low + 1 < high) { const mid = Math.floor((low + high) / 2); if (canProduce(data, tier, mid)) low = mid; else high = mid; }
  return low;
}
function blockingTier(data: FamilyState, tier: ProductionTier, amount: number): ProductionTier {
  const missing = Math.max(0, amount - data.refined[tier]);
  if (missing <= 0 || tier === 3) return tier;
  const prev = (tier - 1) as ProductionTier;
  return canProduce(data, prev, missing) ? tier : blockingTier(data, prev, missing);
}
function switchHero(data: FamilyState, tier: ProductionTier): void { if (data.heroTier !== tier) { data.heroTier = tier; data.heroRemaining = heroTicks(tier, data.heroXp); } }
function switchWorker(data: FamilyState, tier: ProductionTier): void { if (data.workerTier !== tier) { data.workerTier = tier; data.workerRemaining = workerTicks(tier, data.workerXp); } }
function tick(state: State, heroActive: boolean, demandTier = state.tier, demand?: Record<Family, number>): void {
  state.ticks += 1;
  if (state.ticks > MAX_TICKS) throw new Error("worker shard diagnostic runaway");
  for (const family of FAMILIES) {
    const data = state.families[family];
    const desired = (demand?.[family] ?? 0) > 0 ? blockingTier(data, demandTier, demand?.[family] ?? 0) : state.tier;
    data.workerRemaining -= 1;
    if (data.workerRemaining <= 0) {
      data.raw[data.workerTier] += 1;
      data.workerXp += getWorkerGatheringXpForTier(data.workerTier);
      data.heroXp += getHeroGatheringXpFromWorkerForTier(data.workerTier);
      switchWorker(data, desired);
      data.workerRemaining = workerTicks(data.workerTier, data.workerXp);
    }
  }
  if (!heroActive) return;
  const family = FAMILIES[state.activeFamily] ?? "wood";
  const data = state.families[family];
  const desired = (demand?.[family] ?? 0) > 0 ? blockingTier(data, demandTier, demand?.[family] ?? 0) : state.tier;
  data.heroRemaining -= 1;
  if (data.heroRemaining <= 0) {
    data.raw[data.heroTier] += 1;
    data.heroXp += getHeroGatheringXpForTier(data.heroTier);
    switchHero(data, desired);
    data.heroRemaining = heroTicks(data.heroTier, data.heroXp);
    state.activeFamily = (state.activeFamily + 1) % FAMILIES.length;
  }
}
function spend(state: State, tier: ProductionTier, costs: Record<Family, number>): boolean {
  if (!FAMILIES.every((f) => canProduce(state.families[f], tier, costs[f]))) return false;
  for (const f of FAMILIES) { produce(state.families[f], tier, costs[f]); state.families[f].refined[tier] -= costs[f]; }
  return true;
}
function familyFor(itemId: string): Family | undefined {
  if (itemId.includes("plank")) return "wood"; if (itemId.includes("bar")) return "ore";
  if (itemId.includes("leather")) return "hide"; if (itemId.includes("cloth")) return "fiber"; return undefined;
}
function itemIds(tier: EquipmentTier): readonly string[] {
  if (tier === 3) return ["item_weapon_bow_t3_longbow", "item_iron_helmet", "item_leather_armor", "item_leather_boots"];
  return [`item_weapon_bow_t${tier}_longbow`, `item_helmet_t${tier}_reinforced`, `item_armor_t${tier}_leather`, `item_boots_t${tier}_leather`];
}
function refinedCraftCost(tier: TargetTier): Record<Family, number> {
  const costs: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const itemId of itemIds(tier)) {
    const recipe = EQUIPMENT_CRAFT_RECIPES.find((r) => r.outputItemId === itemId);
    if (recipe === undefined) throw new Error(`Missing recipe ${itemId}`);
    for (const req of recipe.requirements) { const family = familyFor(req.itemId); if (family !== undefined) costs[family] += req.quantity; }
  }
  return costs;
}
function enchantCost(tier: TargetTier, level: 1 | 2 | 3): { shards: number; refined: Record<Family, number> } {
  let shards = 0; const refined: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const itemId of itemIds(tier)) {
    const info = resolveEnchantmentItemInfo(itemId); if (info === undefined || !info.enchantable) continue;
    const scaled = scaleEnchantmentRecipe(ENCHANTMENT_RECIPES[level], tier, info.costCategory, info.craftMaterials);
    for (const material of scaled.materials) {
      if (material.itemId.includes("enchantment_shard")) shards += material.quantity;
      const family = familyFor(material.itemId); if (family !== undefined) refined[family] += material.quantity;
    }
  }
  return { shards, refined };
}
function weaponId(tier: TargetTier, suffix: (typeof WEAPONS)[number]): string {
  const [family, spec] = suffix.split("_");
  if (family === "gloves") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  if (family === "dagger") return `item_weapon_dagger_t${tier}_pair`;
  return `item_weapon_${family}_t${tier}_${spec}`;
}
function equipment(tier: TargetTier, weapon: string): readonly string[] {
  const items = [`item_helmet_t${tier}_reinforced`, `item_armor_t${tier}_leather`, `item_boots_t${tier}_leather`, "item_traveler_cape"];
  if (resolveEquipmentInfo(weapon)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`);
  return items;
}
function averageShardRate(tier: TargetTier, enchantment: Enchantment): number {
  const mastery = ENTRY_MASTERY[tier];
  const rates = WEAPONS.map((suffix) => {
    const weapon = weaponId(tier, suffix); let best = 0;
    for (const zone of ZONES[tier]) for (let segment = 0; segment < 10; segment += 1) {
      const result = runCombatRuntimeBenchmark({ label: `worker_shard_T${tier}.${enchantment}_${suffix}_${zone}_${segment}`, weaponItemId: weapon, zoneDefId: zone as never, segmentIndex: segment, equipmentItemIds: equipment(tier, weapon), masteryLevel: mastery, enchantment, useHealthPotions: false });
      if (!result.clear || result.seconds <= 0) continue;
      best = Math.max(best, getExpectedEnchantmentShardsPerSegment(zone as never, segment) * 3600 / result.seconds);
    }
    return best;
  });
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}
function minHeroLevel(state: State): number { return Math.min(...FAMILIES.map((f) => masteryLevel(state.families[f].heroXp))); }
function setGatherTier(state: State, tier: ProductionTier): void { for (const f of FAMILIES) { switchHero(state.families[f], tier); switchWorker(state.families[f], tier); } }
function workshopFallback(total: number): Record<Family, number> {
  const base = Math.floor(total / 4); let remainder = total % 4;
  return Object.fromEntries(FAMILIES.map((f) => [f, base + (remainder-- > 0 ? 1 : 0)])) as Record<Family, number>;
}
function buildWorkshop(state: State, tier: ProductionTier, total: number): Record<Family, number> | null {
  const cap = Object.fromEntries(FAMILIES.map((f) => [f, maxProducible(state.families[f], tier)])) as Record<Family, number>;
  const contributors = [...FAMILIES].filter((f) => cap[f] > 0).sort((a, b) => cap[b] - cap[a]);
  if (contributors.length < 3) return null;
  const out: Record<Family, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  for (const f of contributors.slice(0, 3)) out[f] = 1;
  let remaining = total - 3;
  while (remaining > 0) {
    const f = contributors.filter((x) => out[x] < cap[x]).sort((a, b) => (cap[b] - out[b]) - (cap[a] - out[a]))[0];
    if (f === undefined) return null; out[f] += 1; remaining -= 1;
  }
  return out;
}
function prepareTransition(state: State, sourceTier: ProductionTier, targetTier: TargetTier): void {
  state.tier = sourceTier; setGatherTier(state, sourceTier);
  const gate = getRequiredGatheringMasteryForTier(targetTier);
  while (minHeroLevel(state) < gate) tick(state, true);
  const sourceLevel = sourceTier - 2;
  const mono = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel)?.upgradeToNext?.requirements[0]?.quantity;
  if (mono === undefined) throw new Error("Missing mono cost");
  const monoCosts: Record<Family, number> = { wood: mono * 2, ore: mono * 2, hide: mono * 2, fiber: mono * 2 };
  while (!spend(state, sourceTier, monoCosts)) tick(state, true, sourceTier, monoCosts);
  const workshop = getIslandOperationalLevelDefinition("workshop", sourceLevel)?.upgradeToNext?.flexibleRequirement?.totalQuantity;
  if (workshop === undefined) throw new Error("Missing workshop cost");
  let allocation = buildWorkshop(state, sourceTier, workshop);
  while (allocation === null || !spend(state, sourceTier, allocation)) {
    tick(state, true, sourceTier, allocation ?? workshopFallback(workshop));
    allocation = buildWorkshop(state, sourceTier, workshop);
  }
}
function snapshot(state: State, tier: ProductionTier): string { return FAMILIES.map((f) => `${f}:${state.families[f].raw[tier]}r/${state.families[f].refined[tier]}f`).join(" "); }
function round2(x: number): number { return Number(x.toFixed(2)); }

describe("global economy worker production during shard farm diagnostic", () => {
  it("measures whether workers cover enchantment materials while the hero farms shards", () => {
    const state = createState();
    const rows: object[] = [];
    for (const targetTier of [4, 5, 6, 7, 8] as const) {
      const sourceTier = (targetTier - 1) as ProductionTier;
      prepareTransition(state, sourceTier, targetTier);
      state.tier = targetTier; setGatherTier(state, targetTier);
      const craft = refinedCraftCost(targetTier);
      while (!spend(state, targetTier, craft)) tick(state, true, targetTier, craft);

      let extraHeroGatherHours = 0;
      for (const level of [1, 2, 3] as const) {
        const cost = enchantCost(targetTier, level);
        const rate = averageShardRate(targetTier, (level - 1) as Enchantment);
        if (rate <= 0) throw new Error(`No shard farm for T${targetTier}.${level - 1}`);
        const shardHours = cost.shards / rate;
        const workerTicksToRun = Math.ceil(shardHours * 3600 / TICK_SECONDS);
        for (let i = 0; i < workerTicksToRun; i += 1) tick(state, false, targetTier, cost.refined);
        const beforeSpend = Object.fromEntries(FAMILIES.map((f) => [f, maxProducible(state.families[f], targetTier)])) as Record<Family, number>;
        const coveredByWorkers = FAMILIES.every((f) => beforeSpend[f] >= cost.refined[f]);
        if (!coveredByWorkers) {
          const start = state.ticks;
          while (!spend(state, targetTier, cost.refined)) tick(state, true, targetTier, cost.refined);
          extraHeroGatherHours += (state.ticks - start) * TICK_SECONDS / 3600;
        } else {
          spend(state, targetTier, cost.refined);
        }
        rows.push({
          tier: `T${targetTier}`,
          step: `.${level - 1}->.${level}`,
          shardFarmHours: round2(shardHours),
          workerCoverage: coveredByWorkers,
          enchantRefined: FAMILIES.map((f) => `${f}:${cost.refined[f]}`).join(" "),
          producibleBeforeSpend: FAMILIES.map((f) => `${f}:${beforeSpend[f]}`).join(" "),
          cumulativeExtraHeroGatherHours: round2(extraHeroGatherHours),
          stocksAfterStep: snapshot(state, targetTier),
        });
      }
    }
    console.log("[GLOBAL_ECONOMY_WORKER_DURING_SHARD_FARM]");
    console.table(rows);
    console.log("[GLOBAL_ECONOMY_WORKER_DURING_SHARD_FARM_JSON]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(15);
  });
});
