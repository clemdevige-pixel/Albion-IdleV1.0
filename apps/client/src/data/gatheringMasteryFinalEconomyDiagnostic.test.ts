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
type WeaponProfile = (typeof WEAPONS)[number];

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
function emptyCosts(): Record<Family, number> { return { wood: 0, ore: 0, hide: 0, fiber: 0 }; }
function addCosts(target: Record<Family, number>, source: Readonly<Record<Family, number>>): void { for (const f of FAMILIES) target[f] += source[f]; }
function round2(x: number): number { return Number(x.toFixed(2)); }
function masteryLevel(xp: number): number {
  let remaining = Math.max(0, xp);
  let level = 0;
  for (const cost of GATHERING_MASTERY_XP) {
    if (remaining < cost) break;
    remaining -= cost;
    level += 1;
  }
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
    heroXp: 0,
    workerXp: 0,
    heroRemaining: heroTicks(3, 0),
    workerRemaining: workerTicks(3, 0),
    heroTier: 3,
    workerTier: 3,
    raw: emptyTiers(),
    refined: emptyTiers(),
  }])) as Record<Family, FamilyState>;
  return { tier: 3, ticks: 0, activeFamily: 0, families };
}
function canProduce(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  const raw = { ...data.raw };
  const refined = { ...data.refined };
  const ensure = (t: ProductionTier, need: number): boolean => {
    if (refined[t] >= need) return true;
    const missing = need - refined[t];
    if (t === 3) {
      const rawNeed = missing * 4;
      if (raw[3] < rawNeed) return false;
      raw[3] -= rawNeed;
      refined[3] += missing;
      return true;
    }
    const prev = (t - 1) as ProductionTier;
    if (!ensure(prev, missing)) return false;
    const rawNeed = missing * 2;
    if (raw[t] < rawNeed) return false;
    raw[t] -= rawNeed;
    refined[prev] -= missing;
    refined[t] += missing;
    return true;
  };
  return ensure(tier, amount);
}
function produce(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  if (data.refined[tier] >= amount) return true;
  const missing = amount - data.refined[tier];
  if (tier === 3) {
    const rawNeed = missing * 4;
    if (data.raw[3] < rawNeed) return false;
    data.raw[3] -= rawNeed;
    data.refined[3] += missing;
    return true;
  }
  const prev = (tier - 1) as ProductionTier;
  if (!produce(data, prev, missing)) return false;
  const rawNeed = missing * 2;
  if (data.raw[tier] < rawNeed) return false;
  data.raw[tier] -= rawNeed;
  data.refined[prev] -= missing;
  data.refined[tier] += missing;
  return true;
}
function maxProducible(data: FamilyState, tier: ProductionTier): number {
  let low = 0;
  let high = 1;
  while (high < 100_000 && canProduce(data, tier, high)) high *= 2;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (canProduce(data, tier, mid)) low = mid;
    else high = mid;
  }
  return low;
}
function blockingTier(data: FamilyState, tier: ProductionTier, amount: number): ProductionTier {
  const missing = Math.max(0, amount - data.refined[tier]);
  if (missing <= 0 || tier === 3) return tier;
  const prev = (tier - 1) as ProductionTier;
  return canProduce(data, prev, missing) ? tier : blockingTier(data, prev, missing);
}
function switchHero(data: FamilyState, tier: ProductionTier): void {
  if (data.heroTier !== tier) {
    data.heroTier = tier;
    data.heroRemaining = heroTicks(tier, data.heroXp);
  }
}
function switchWorker(data: FamilyState, tier: ProductionTier): void {
  if (data.workerTier !== tier) {
    data.workerTier = tier;
    data.workerRemaining = workerTicks(tier, data.workerXp);
  }
}
function tick(state: State, heroActive: boolean, demandTier = state.tier, demand?: Record<Family, number>): void {
  state.ticks += 1;
  if (state.ticks > MAX_TICKS) throw new Error("mastery economy diagnostic runaway");
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
  for (const f of FAMILIES) {
    produce(state.families[f], tier, costs[f]);
    state.families[f].refined[tier] -= costs[f];
  }
  return true;
}
function familyFor(itemId: string): Family | undefined {
  if (itemId.includes("plank")) return "wood";
  if (itemId.includes("bar")) return "ore";
  if (itemId.includes("leather")) return "hide";
  if (itemId.includes("cloth")) return "fiber";
  return undefined;
}
function weaponId(tier: EquipmentTier, profile: WeaponProfile): string {
  const [family, spec] = profile.split("_");
  if (family === "gloves") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  if (family === "dagger") return `item_weapon_dagger_t${tier}_pair`;
  return `item_weapon_${family}_t${tier}_${spec}`;
}
function profileItemIds(tier: TargetTier, profile: WeaponProfile): readonly string[] {
  const weapon = weaponId(tier, profile);
  const items = [weapon, `item_helmet_t${tier}_reinforced`, `item_armor_t${tier}_leather`, `item_boots_t${tier}_leather`];
  if (resolveEquipmentInfo(weapon)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`);
  return items;
}
function liveCraftCost(tier: TargetTier, profile: WeaponProfile): Record<Family, number> {
  const out = emptyCosts();
  for (const itemId of profileItemIds(tier, profile)) {
    const recipe = EQUIPMENT_CRAFT_RECIPES.find((r) => r.outputItemId === itemId);
    if (recipe === undefined) throw new Error(`Missing live recipe ${itemId}`);
    for (const req of recipe.requirements) {
      const family = familyFor(req.itemId);
      if (family !== undefined) out[family] += req.quantity;
    }
  }
  return out;
}
function liveEnchantCost(tier: TargetTier, profile: WeaponProfile, level: 1 | 2 | 3): { shards: number; refined: Record<Family, number> } {
  let shards = 0;
  const refined = emptyCosts();
  for (const itemId of profileItemIds(tier, profile)) {
    const info = resolveEnchantmentItemInfo(itemId);
    if (info === undefined || !info.enchantable) continue;
    const scaled = scaleEnchantmentRecipe(ENCHANTMENT_RECIPES[level], tier, info.costCategory, info.craftMaterials);
    for (const material of scaled.materials) {
      if (material.itemId.includes("enchantment_shard")) shards += material.quantity;
      const family = familyFor(material.itemId);
      if (family !== undefined) refined[family] += material.quantity;
    }
  }
  return { shards, refined };
}
function combatEquipment(tier: TargetTier, weapon: string): readonly string[] {
  const items = [`item_helmet_t${tier}_reinforced`, `item_armor_t${tier}_leather`, `item_boots_t${tier}_leather`, "item_traveler_cape"];
  if (resolveEquipmentInfo(weapon)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`);
  return items;
}
const shardRateCache = new Map<string, number>();
function liveShardRate(tier: TargetTier, profile: WeaponProfile, enchantment: Enchantment): number {
  const key = `${tier}:${profile}:${enchantment}`;
  const cached = shardRateCache.get(key);
  if (cached !== undefined) return cached;
  const weapon = weaponId(tier, profile);
  let best = 0;
  for (const zone of ZONES[tier]) {
    for (let segment = 0; segment < 10; segment += 1) {
      const result = runCombatRuntimeBenchmark({
        label: `mastery_${profile}_T${tier}.${enchantment}_${zone}_${segment}`,
        weaponItemId: weapon,
        zoneDefId: zone as never,
        segmentIndex: segment,
        equipmentItemIds: combatEquipment(tier, weapon),
        masteryLevel: ENTRY_MASTERY[tier],
        enchantment,
        useHealthPotions: false,
      });
      if (!result.clear || result.seconds <= 0) continue;
      best = Math.max(best, getExpectedEnchantmentShardsPerSegment(zone as never, segment) * 3600 / result.seconds);
    }
  }
  shardRateCache.set(key, best);
  return best;
}
function levels(state: State): Record<Family, number> { return Object.fromEntries(FAMILIES.map((f) => [f, masteryLevel(state.families[f].heroXp)])) as Record<Family, number>; }
function minLevel(state: State): number { return Math.min(...Object.values(levels(state))); }
function setGatherTier(state: State, tier: ProductionTier): void { for (const f of FAMILIES) { switchHero(state.families[f], tier); switchWorker(state.families[f], tier); } }
function workshopFallback(total: number): Record<Family, number> {
  const base = Math.floor(total / 4);
  let remainder = total % 4;
  return Object.fromEntries(FAMILIES.map((f) => [f, base + (remainder-- > 0 ? 1 : 0)])) as Record<Family, number>;
}
function buildWorkshop(state: State, tier: ProductionTier, total: number): Record<Family, number> | null {
  const cap = Object.fromEntries(FAMILIES.map((f) => [f, maxProducible(state.families[f], tier)])) as Record<Family, number>;
  const contributors = [...FAMILIES].filter((f) => cap[f] > 0).sort((a, b) => cap[b] - cap[a]);
  if (contributors.length < 3) return null;
  const out = emptyCosts();
  for (const f of contributors.slice(0, 3)) out[f] = 1;
  let remaining = total - 3;
  while (remaining > 0) {
    const f = contributors.filter((x) => out[x] < cap[x]).sort((a, b) => (cap[b] - out[b]) - (cap[a] - out[a]))[0];
    if (f === undefined) return null;
    out[f] += 1;
    remaining -= 1;
  }
  return out;
}
function prepareTransition(state: State, sourceTier: ProductionTier, targetTier: TargetTier): { gate: number; beforeGate: number; gateHours: number } {
  state.tier = sourceTier;
  setGatherTier(state, sourceTier);
  const gate = getRequiredGatheringMasteryForTier(targetTier);
  const beforeGate = minLevel(state);
  const gateStart = state.ticks;
  while (minLevel(state) < gate) tick(state, true);
  const gateHours = (state.ticks - gateStart) * TICK_SECONDS / 3600;

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
  return { gate, beforeGate, gateHours };
}

function run(profile: WeaponProfile) {
  const state = createState();
  const rows: Array<Record<string, string | number>> = [];
  for (const tier of [4, 5, 6, 7, 8] as const) {
    const transition = prepareTransition(state, (tier - 1) as ProductionTier, tier);
    const afterInfrastructure = levels(state);
    state.tier = tier;
    setGatherTier(state, tier);

    const craft = liveCraftCost(tier, profile);
    while (!spend(state, tier, craft)) tick(state, true, tier, craft);

    let shardHours = 0;
    let gatherHours = 0;
    for (const level of [1, 2, 3] as const) {
      const cost = liveEnchantCost(tier, profile, level);
      const rate = liveShardRate(tier, profile, (level - 1) as Enchantment);
      if (rate <= 0) throw new Error(`No live shard farm ${profile} T${tier}.${level - 1}`);
      const hours = cost.shards / rate;
      shardHours += hours;
      const workerTicksToRun = Math.ceil(hours * 3600 / TICK_SECONDS);
      for (let i = 0; i < workerTicksToRun; i += 1) tick(state, false, tier, cost.refined);
      if (!FAMILIES.every((f) => maxProducible(state.families[f], tier) >= cost.refined[f])) {
        const start = state.ticks;
        while (!spend(state, tier, cost.refined)) tick(state, true, tier, cost.refined);
        gatherHours += (state.ticks - start) * TICK_SECONDS / 3600;
      } else {
        spend(state, tier, cost.refined);
      }
    }

    const end = levels(state);
    rows.push({
      weapon: profile,
      tier: `T${tier}`,
      nextGate: tier < 8 ? getRequiredGatheringMasteryForTier(tier + 1) : 0,
      minBeforeCurrentGate: transition.beforeGate,
      currentGate: transition.gate,
      hoursBlockedByCurrentGate: round2(transition.gateHours),
      minAfterInfrastructure: Math.min(...Object.values(afterInfrastructure)),
      minAtTierEnd: Math.min(...Object.values(end)),
      wood: end.wood,
      ore: end.ore,
      hide: end.hide,
      fiber: end.fiber,
      shardHours: round2(shardHours),
      heroGatherHours: round2(gatherHours),
    });
  }
  return rows;
}

describe("gathering mastery gates against final live economy", () => {
  it("prints mastery levels reached by each weapon profile before every tier transition", () => {
    const rows = WEAPONS.flatMap(run);
    const summary = [4, 5, 6, 7, 8].map((tier) => {
      const tierRows = rows.filter((row) => row.tier === `T${tier}`);
      const minAtTierEnd = Math.min(...tierRows.map((row) => Number(row.minAtTierEnd)));
      const maxAtTierEnd = Math.max(...tierRows.map((row) => Number(row.minAtTierEnd)));
      const avgAtTierEnd = tierRows.reduce((sum, row) => sum + Number(row.minAtTierEnd), 0) / tierRows.length;
      const nextGate = Number(tierRows[0]?.nextGate ?? 0);
      return {
        tier: `T${tier}`,
        currentGate: Number(tierRows[0]?.currentGate ?? 0),
        nextGate,
        minMasteryAtTierEnd: minAtTierEnd,
        avgMasteryAtTierEnd: round2(avgAtTierEnd),
        maxMasteryAtTierEnd: maxAtTierEnd,
        headroomVsNextGate: nextGate > 0 ? minAtTierEnd - nextGate : 0,
        maxHoursBlockedByCurrentGate: Math.max(...tierRows.map((row) => Number(row.hoursBlockedByCurrentGate))),
      };
    });

    console.log("[GATHERING_MASTERY_FINAL_ECONOMY_SUMMARY]");
    console.table(summary);
    console.log("[GATHERING_MASTERY_FINAL_ECONOMY_DETAIL]");
    console.table(rows);
    console.log("[GATHERING_MASTERY_FINAL_ECONOMY_SUMMARY_JSON]", JSON.stringify(summary, null, 2));

    expect(rows).toHaveLength(WEAPONS.length * 5);
  });
});
