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

// Diagnostic-only candidate. Total material count per armor piece is kept identical to live.
const CANDIDATE_COMMON_ARMOR: Readonly<Record<TargetTier, Readonly<Record<"head" | "chest" | "boots", Readonly<Record<Family, number>>>>>> = {
  4: { head: { wood: 1, ore: 4, hide: 2, fiber: 1 }, chest: { wood: 2, ore: 1, hide: 3, fiber: 3 }, boots: { wood: 2, ore: 1, hide: 2, fiber: 1 } },
  5: { head: { wood: 2, ore: 5, hide: 2, fiber: 1 }, chest: { wood: 2, ore: 2, hide: 4, fiber: 3 }, boots: { wood: 2, ore: 1, hide: 3, fiber: 2 } },
  6: { head: { wood: 2, ore: 6, hide: 2, fiber: 2 }, chest: { wood: 3, ore: 2, hide: 4, fiber: 4 }, boots: { wood: 3, ore: 1, hide: 3, fiber: 3 } },
  7: { head: { wood: 3, ore: 7, hide: 2, fiber: 2 }, chest: { wood: 3, ore: 3, hide: 5, fiber: 4 }, boots: { wood: 3, ore: 2, hide: 4, fiber: 3 } },
  8: { head: { wood: 3, ore: 8, hide: 3, fiber: 2 }, chest: { wood: 4, ore: 3, hide: 5, fiber: 5 }, boots: { wood: 4, ore: 2, hide: 4, fiber: 4 } },
};

interface FamilyState {
  heroXp: number; workerXp: number; heroRemaining: number; workerRemaining: number;
  heroTier: ProductionTier; workerTier: ProductionTier;
  raw: Record<ProductionTier, number>; refined: Record<ProductionTier, number>;
}
interface State { tier: ProductionTier; ticks: number; activeFamily: number; families: Record<Family, FamilyState>; }

function emptyTiers(): Record<ProductionTier, number> { return { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }; }
function emptyCosts(): Record<Family, number> { return { wood: 0, ore: 0, hide: 0, fiber: 0 }; }
function addCosts(target: Record<Family, number>, source: Readonly<Record<Family, number>>): void { for (const f of FAMILIES) target[f] += source[f]; }
function formatCosts(costs: Readonly<Record<Family, number>>): string { return FAMILIES.map((f) => `${f}:${costs[f]}`).join(" "); }
function masteryLevel(xp: number): number { let r = Math.max(0, xp); let level = 0; for (const cost of GATHERING_MASTERY_XP) { if (r < cost) break; r -= cost; level += 1; } return Math.min(100, level); }
function workerLevel(xp: number): number { return Math.min(100, Math.floor(Math.sqrt(Math.max(0, xp) / 100))); }
function heroTicks(tier: ProductionTier, xp: number): number { const rules = getProductionTierRules(tier); return Math.max(1, Math.ceil(rules.gatheringBaseTicks * rules.gatheringToolSpeedModifier * Math.max(0.5, 1 - masteryLevel(xp) * 0.005))); }
function workerTicks(tier: ProductionTier, xp: number): number { const rules = getProductionTierRules(tier); return Math.max(1, Math.ceil(60 / Math.max(0.01, rules.workerSpeedModifier * (1 + workerLevel(xp) * 0.005)))); }
function createState(): State {
  const families = Object.fromEntries(FAMILIES.map((family) => [family, { heroXp: 0, workerXp: 0, heroRemaining: heroTicks(3, 0), workerRemaining: workerTicks(3, 0), heroTier: 3, workerTier: 3, raw: emptyTiers(), refined: emptyTiers() }])) as Record<Family, FamilyState>;
  return { tier: 3, ticks: 0, activeFamily: 0, families };
}
function canProduce(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  const raw = { ...data.raw }; const refined = { ...data.refined };
  const ensure = (t: ProductionTier, need: number): boolean => {
    if (refined[t] >= need) return true;
    const missing = need - refined[t];
    if (t === 3) { const rawNeed = missing * 4; if (raw[3] < rawNeed) return false; raw[3] -= rawNeed; refined[3] += missing; return true; }
    const prev = (t - 1) as ProductionTier; if (!ensure(prev, missing)) return false;
    const rawNeed = missing * 2; if (raw[t] < rawNeed) return false; raw[t] -= rawNeed; refined[prev] -= missing; refined[t] += missing; return true;
  };
  return ensure(tier, amount);
}
function produce(data: FamilyState, tier: ProductionTier, amount: number): boolean {
  if (data.refined[tier] >= amount) return true;
  const missing = amount - data.refined[tier];
  if (tier === 3) { const rawNeed = missing * 4; if (data.raw[3] < rawNeed) return false; data.raw[3] -= rawNeed; data.refined[3] += missing; return true; }
  const prev = (tier - 1) as ProductionTier; if (!produce(data, prev, missing)) return false;
  const rawNeed = missing * 2; if (data.raw[tier] < rawNeed) return false; data.raw[tier] -= rawNeed; data.refined[prev] -= missing; data.refined[tier] += missing; return true;
}
function maxProducible(data: FamilyState, tier: ProductionTier): number { let low = 0; let high = 1; while (high < 100_000 && canProduce(data, tier, high)) high *= 2; while (low + 1 < high) { const mid = Math.floor((low + high) / 2); if (canProduce(data, tier, mid)) low = mid; else high = mid; } return low; }
function blockingTier(data: FamilyState, tier: ProductionTier, amount: number): ProductionTier { const missing = Math.max(0, amount - data.refined[tier]); if (missing <= 0 || tier === 3) return tier; const prev = (tier - 1) as ProductionTier; return canProduce(data, prev, missing) ? tier : blockingTier(data, prev, missing); }
function switchHero(data: FamilyState, tier: ProductionTier): void { if (data.heroTier !== tier) { data.heroTier = tier; data.heroRemaining = heroTicks(tier, data.heroXp); } }
function switchWorker(data: FamilyState, tier: ProductionTier): void { if (data.workerTier !== tier) { data.workerTier = tier; data.workerRemaining = workerTicks(tier, data.workerXp); } }
function tick(state: State, heroActive: boolean, demandTier = state.tier, demand?: Record<Family, number>): void {
  state.ticks += 1; if (state.ticks > MAX_TICKS) throw new Error("candidate diagnostic runaway");
  for (const family of FAMILIES) {
    const data = state.families[family]; const desired = (demand?.[family] ?? 0) > 0 ? blockingTier(data, demandTier, demand?.[family] ?? 0) : state.tier;
    data.workerRemaining -= 1;
    if (data.workerRemaining <= 0) { data.raw[data.workerTier] += 1; data.workerXp += getWorkerGatheringXpForTier(data.workerTier); data.heroXp += getHeroGatheringXpFromWorkerForTier(data.workerTier); switchWorker(data, desired); data.workerRemaining = workerTicks(data.workerTier, data.workerXp); }
  }
  if (!heroActive) return;
  const family = FAMILIES[state.activeFamily] ?? "wood"; const data = state.families[family]; const desired = (demand?.[family] ?? 0) > 0 ? blockingTier(data, demandTier, demand?.[family] ?? 0) : state.tier;
  data.heroRemaining -= 1;
  if (data.heroRemaining <= 0) { data.raw[data.heroTier] += 1; data.heroXp += getHeroGatheringXpForTier(data.heroTier); switchHero(data, desired); data.heroRemaining = heroTicks(data.heroTier, data.heroXp); state.activeFamily = (state.activeFamily + 1) % FAMILIES.length; }
}
function spend(state: State, tier: ProductionTier, costs: Record<Family, number>): boolean { if (!FAMILIES.every((f) => canProduce(state.families[f], tier, costs[f]))) return false; for (const f of FAMILIES) { produce(state.families[f], tier, costs[f]); state.families[f].refined[tier] -= costs[f]; } return true; }
function familyFor(itemId: string): Family | undefined { if (itemId.includes("plank")) return "wood"; if (itemId.includes("bar")) return "ore"; if (itemId.includes("leather")) return "hide"; if (itemId.includes("cloth")) return "fiber"; return undefined; }
function weaponId(tier: EquipmentTier, profile: WeaponProfile): string { const [family, spec] = profile.split("_"); if (family === "gloves") return `item_weapon_gloves_t${tier}_spiked_gauntlets`; if (family === "dagger") return `item_weapon_dagger_t${tier}_pair`; return `item_weapon_${family}_t${tier}_${spec}`; }
function commonItemIds(tier: TargetTier): readonly string[] { return [`item_helmet_t${tier}_reinforced`, `item_armor_t${tier}_leather`, `item_boots_t${tier}_leather`]; }
function profileItemIds(tier: TargetTier, profile: WeaponProfile): readonly string[] { const weapon = weaponId(tier, profile); const items = [weapon, ...commonItemIds(tier)]; if (resolveEquipmentInfo(weapon)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`); return items; }
function slotForCommon(itemId: string): "head" | "chest" | "boots" | undefined { if (itemId.includes("helmet")) return "head"; if (itemId.includes("armor_t")) return "chest"; if (itemId.includes("boots")) return "boots"; return undefined; }
function liveRecipeCosts(itemId: string): Record<Family, number> {
  const recipe = EQUIPMENT_CRAFT_RECIPES.find((r) => r.outputItemId === itemId); if (recipe === undefined) throw new Error(`Missing recipe ${itemId}`);
  const out = emptyCosts(); for (const req of recipe.requirements) { const family = familyFor(req.itemId); if (family !== undefined) out[family] += req.quantity; } return out;
}
function candidateCraftCost(tier: TargetTier, profile: WeaponProfile): Record<Family, number> {
  const out = emptyCosts();
  for (const itemId of profileItemIds(tier, profile)) { const slot = slotForCommon(itemId); if (slot !== undefined) addCosts(out, CANDIDATE_COMMON_ARMOR[tier][slot]); else addCosts(out, liveRecipeCosts(itemId)); }
  return out;
}
function craftMaterialsFromCosts(costs: Readonly<Record<Family, number>>) {
  const map = { wood: "wood", ore: "metal", hide: "leather", fiber: "cloth" } as const;
  return FAMILIES.filter((f) => costs[f] > 0).map((f) => ({ kind: map[f], quantity: costs[f] }));
}
function candidateEnchantCost(tier: TargetTier, profile: WeaponProfile, level: 1 | 2 | 3): { shards: number; refined: Record<Family, number> } {
  let shards = 0; const refined = emptyCosts();
  for (const itemId of profileItemIds(tier, profile)) {
    const info = resolveEnchantmentItemInfo(itemId); if (info === undefined || !info.enchantable) continue;
    const slot = slotForCommon(itemId);
    const craftMaterials = slot === undefined ? info.craftMaterials : craftMaterialsFromCosts(CANDIDATE_COMMON_ARMOR[tier][slot]);
    const scaled = scaleEnchantmentRecipe(ENCHANTMENT_RECIPES[level], tier, info.costCategory, craftMaterials);
    for (const material of scaled.materials) { if (material.itemId.includes("enchantment_shard")) shards += material.quantity; const family = familyFor(material.itemId); if (family !== undefined) refined[family] += material.quantity; }
  }
  return { shards, refined };
}
function combatEquipment(tier: TargetTier, weapon: string): readonly string[] { const items = [`item_helmet_t${tier}_reinforced`, `item_armor_t${tier}_leather`, `item_boots_t${tier}_leather`, "item_traveler_cape"]; if (resolveEquipmentInfo(weapon)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`); return items; }
function shardRate(tier: TargetTier, profile: WeaponProfile, enchantment: Enchantment): number {
  const mastery = ENTRY_MASTERY[tier]; const weapon = weaponId(tier, profile); let best = 0;
  for (const zone of ZONES[tier]) for (let segment = 0; segment < 10; segment += 1) { const result = runCombatRuntimeBenchmark({ label: `candidate_${profile}_T${tier}.${enchantment}_${zone}_${segment}`, weaponItemId: weapon, zoneDefId: zone as never, segmentIndex: segment, equipmentItemIds: combatEquipment(tier, weapon), masteryLevel: mastery, enchantment, useHealthPotions: false }); if (!result.clear || result.seconds <= 0) continue; best = Math.max(best, getExpectedEnchantmentShardsPerSegment(zone as never, segment) * 3600 / result.seconds); }
  return best;
}
function minHeroLevel(state: State): number { return Math.min(...FAMILIES.map((f) => masteryLevel(state.families[f].heroXp))); }
function setGatherTier(state: State, tier: ProductionTier): void { for (const f of FAMILIES) { switchHero(state.families[f], tier); switchWorker(state.families[f], tier); } }
function workshopFallback(total: number): Record<Family, number> { const base = Math.floor(total / 4); let remainder = total % 4; return Object.fromEntries(FAMILIES.map((f) => [f, base + (remainder-- > 0 ? 1 : 0)])) as Record<Family, number>; }
function buildWorkshop(state: State, tier: ProductionTier, total: number): Record<Family, number> | null { const cap = Object.fromEntries(FAMILIES.map((f) => [f, maxProducible(state.families[f], tier)])) as Record<Family, number>; const contributors = [...FAMILIES].filter((f) => cap[f] > 0).sort((a, b) => cap[b] - cap[a]); if (contributors.length < 3) return null; const out = emptyCosts(); for (const f of contributors.slice(0, 3)) out[f] = 1; let remaining = total - 3; while (remaining > 0) { const f = contributors.filter((x) => out[x] < cap[x]).sort((a, b) => (cap[b] - out[b]) - (cap[a] - out[a]))[0]; if (f === undefined) return null; out[f] += 1; remaining -= 1; } return out; }
function prepareTransition(state: State, sourceTier: ProductionTier, targetTier: TargetTier): void {
  state.tier = sourceTier; setGatherTier(state, sourceTier); const gate = getRequiredGatheringMasteryForTier(targetTier); while (minHeroLevel(state) < gate) tick(state, true);
  const sourceLevel = sourceTier - 2; const mono = getIslandOperationalLevelDefinition("lumber_camp", sourceLevel)?.upgradeToNext?.requirements[0]?.quantity; if (mono === undefined) throw new Error("Missing mono cost");
  const monoCosts: Record<Family, number> = { wood: mono * 2, ore: mono * 2, hide: mono * 2, fiber: mono * 2 }; while (!spend(state, sourceTier, monoCosts)) tick(state, true, sourceTier, monoCosts);
  const workshop = getIslandOperationalLevelDefinition("workshop", sourceLevel)?.upgradeToNext?.flexibleRequirement?.totalQuantity; if (workshop === undefined) throw new Error("Missing workshop cost");
  let allocation = buildWorkshop(state, sourceTier, workshop); while (allocation === null || !spend(state, sourceTier, allocation)) { tick(state, true, sourceTier, allocation ?? workshopFallback(workshop)); allocation = buildWorkshop(state, sourceTier, workshop); }
}
function round1(x: number): number { return Number(x.toFixed(1)); }
function round2(x: number): number { return Number(x.toFixed(2)); }

function runProfile(profile: WeaponProfile) {
  const state = createState(); const rows: object[] = [];
  for (const tier of [4, 5, 6, 7, 8] as const) {
    prepareTransition(state, (tier - 1) as ProductionTier, tier); state.tier = tier; setGatherTier(state, tier);
    const craft = candidateCraftCost(tier, profile); while (!spend(state, tier, craft)) tick(state, true, tier, craft);
    let shardHours = 0; let gatherHours = 0; let shards = 0; const enchant = emptyCosts(); const bottlenecks = new Set<Family>();
    for (const level of [1, 2, 3] as const) {
      const cost = candidateEnchantCost(tier, profile, level); addCosts(enchant, cost.refined); shards += cost.shards;
      const rate = shardRate(tier, profile, (level - 1) as Enchantment); if (rate <= 0) throw new Error(`No shard farm ${profile} T${tier}.${level - 1}`);
      const hours = cost.shards / rate; shardHours += hours; const workerTicksToRun = Math.ceil(hours * 3600 / TICK_SECONDS); for (let i = 0; i < workerTicksToRun; i += 1) tick(state, false, tier, cost.refined);
      const before = Object.fromEntries(FAMILIES.map((f) => [f, maxProducible(state.families[f], tier)])) as Record<Family, number>; for (const f of FAMILIES) if (before[f] < cost.refined[f]) bottlenecks.add(f);
      if (!FAMILIES.every((f) => before[f] >= cost.refined[f])) { const start = state.ticks; while (!spend(state, tier, cost.refined)) tick(state, true, tier, cost.refined); gatherHours += (state.ticks - start) * TICK_SECONDS / 3600; } else spend(state, tier, cost.refined);
    }
    const combined = shardHours + gatherHours;
    rows.push({ weapon: profile, tier: `T${tier}`, craftRefined: formatCosts(craft), enchantRefined: formatCosts(enchant), totalShards: shards, shardFarmHours: round2(shardHours), extraHeroGatherHours: round2(gatherHours), combinedHours: round2(combined), gatherSharePct: combined > 0 ? round1(gatherHours / combined * 100) : 0, bottlenecks: [...bottlenecks].join(",") || "none" });
  }
  return rows;
}

describe("global economy candidate material redistribution", () => {
  it("benchmarks a balanced common-armor material candidate without touching live recipes", () => {
    const rows = WEAPONS.flatMap((profile) => runProfile(profile));
    console.log("[GLOBAL_ECONOMY_MATERIAL_REDISTRIBUTION_CANDIDATE]");
    console.table(rows);
    console.log("[GLOBAL_ECONOMY_MATERIAL_REDISTRIBUTION_CANDIDATE_JSON]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(WEAPONS.length * 5);
  });
});
