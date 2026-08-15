import { describe, expect, it } from "vitest";
import { createRuntimeServices } from "@game/core";
import { PLAYER_ISLAND_CONFIG, getInitialIslandWorkerHouseLevelDefinition, getIslandBuildingDefinition, getIslandLevelDefinition, type IslandBuildingId } from "@game/data";
import { EQUIPMENT_CRAFT_RECIPES, getProductionRefiningRecipe } from "./refiningRecipes.js";
import { getProductionTierRules, type ProductionFamilyId } from "./productionFamilyCatalog.js";
import { WORKER_TASK_DEFINITIONS } from "./workerContentCatalog.js";

const T3_TARGETS = ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_shield_t3_reinforced"] as const;
const T3_FAMILIES: readonly ProductionFamilyId[] = ["wood", "ore", "hide", "fiber"];
interface MaterialRequirement { readonly itemId: string; readonly quantity: number; }
interface T3OnboardingRow {
  readonly targetItemId: string;
  readonly workshopFamilies: string;
  readonly buildings: string;
  readonly buildingSilverCost: number;
  readonly guidedSilverCostWithOneWorker: number;
  readonly rawWood: number;
  readonly rawOre: number;
  readonly rawHide: number;
  readonly rawFiber: number;
  readonly totalRaw: number;
  readonly gatherSecondsHeroOnly: number;
  readonly gatherSecondsHeroPlusOneWorker: number;
  readonly bestWorkerFamily: ProductionFamilyId;
}

const RAW_ITEM_TO_FAMILY = new Map<string, ProductionFamilyId>(T3_FAMILIES.map((family) => [getProductionRefiningRecipe(family, 3).rawItemId, family] as const));
const REFINED_ITEM_TO_FAMILY = new Map<string, ProductionFamilyId>(T3_FAMILIES.map((family) => [getProductionRefiningRecipe(family, 3).outputItemId, family] as const));
function collectRequiredBuildings(buildingId: IslandBuildingId, output: Set<IslandBuildingId>): void { if (output.has(buildingId)) return; const definition = getIslandBuildingDefinition(buildingId); for (const prerequisite of definition.construction?.prerequisiteBuildings ?? []) collectRequiredBuildings(prerequisite, output); output.add(buildingId); }
function addRawEquivalent(totals: Record<ProductionFamilyId, number>, requirement: MaterialRequirement): void {
  const rawFamily = RAW_ITEM_TO_FAMILY.get(requirement.itemId); if (rawFamily !== undefined) { totals[rawFamily] += requirement.quantity; return; }
  const refinedFamily = REFINED_ITEM_TO_FAMILY.get(requirement.itemId); if (refinedFamily !== undefined) { const recipe = getProductionRefiningRecipe(refinedFamily, 3); for (const input of recipe.requirements) addRawEquivalent(totals, { itemId: input.itemId, quantity: input.quantity * requirement.quantity }); }
}

function secondsWithOneDedicatedWorker(
  rawTotals: Readonly<Record<ProductionFamilyId, number>>,
  heroPerSecond: number,
  workerPerSecond: number,
): { readonly seconds: number; readonly family: ProductionFamilyId } {
  const totalRaw = Object.values(rawTotals).reduce((sum, quantity) => sum + quantity, 0);
  let best = { seconds: totalRaw / heroPerSecond, family: T3_FAMILIES[0] ?? "wood" as ProductionFamilyId };

  for (const family of T3_FAMILIES) {
    const workerTarget = rawTotals[family];
    if (workerTarget <= 0) continue;
    const heroOtherWork = totalRaw - workerTarget;
    const timeGatheringOtherFamilies = heroOtherWork / heroPerSecond;
    const producedByWorkerWhileHeroIsElsewhere = timeGatheringOtherFamilies * workerPerSecond;
    const remainingWorkerFamily = Math.max(0, workerTarget - producedByWorkerWhileHeroIsElsewhere);
    const totalSeconds = timeGatheringOtherFamilies + remainingWorkerFamily / (heroPerSecond + workerPerSecond);
    if (totalSeconds < best.seconds) best = { seconds: totalSeconds, family };
  }

  return best;
}

function buildScenario(targetItemId: string): T3OnboardingRow {
  const recipe = EQUIPMENT_CRAFT_RECIPES.find((entry) => entry.outputItemId === targetItemId); if (recipe === undefined) throw new Error(`Missing T3 craft recipe for ${targetItemId}`);
  const workshop = getIslandBuildingDefinition("workshop").construction; if (workshop?.flexibleRequirement === undefined) throw new Error("Workshop flexible requirement missing");
  const refiningBuildingByFamily: Readonly<Record<ProductionFamilyId, IslandBuildingId>> = { wood: "sawmill", ore: "smelter", hide: "tannery", fiber: "weaver" };
  const recipeFamilies = [...new Set(recipe.requirements.map((requirement) => REFINED_ITEM_TO_FAMILY.get(requirement.itemId)).filter((family): family is ProductionFamilyId => family !== undefined))];
  const workshopFamilies = [...recipeFamilies];
  for (const family of T3_FAMILIES) { if (workshopFamilies.length >= workshop.flexibleRequirement.minimumDistinctItemIds) break; if (!workshopFamilies.includes(family)) workshopFamilies.push(family); }
  workshopFamilies.splice(workshop.flexibleRequirement.minimumDistinctItemIds);

  const requiredBuildings = new Set<IslandBuildingId>(); collectRequiredBuildings("workshop", requiredBuildings);
  for (const family of new Set([...recipeFamilies, ...workshopFamilies])) collectRequiredBuildings(refiningBuildingByFamily[family], requiredBuildings);
  const rawTotals: Record<ProductionFamilyId, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 }; let buildingSilverCost = 0;
  for (const buildingId of requiredBuildings) { const construction = getIslandBuildingDefinition(buildingId).construction; if (construction === undefined) continue; buildingSilverCost += construction.silver; for (const requirement of construction.requirements) addRawEquivalent(rawTotals, requirement); }
  const basePerFamily = Math.floor(workshop.flexibleRequirement.totalQuantity / workshopFamilies.length); let remainder = workshop.flexibleRequirement.totalQuantity % workshopFamilies.length;
  for (const family of workshopFamilies) { const quantity = basePerFamily + (remainder-- > 0 ? 1 : 0); addRawEquivalent(rawTotals, { itemId: getProductionRefiningRecipe(family, 3).outputItemId, quantity }); }
  for (const requirement of recipe.requirements) addRawEquivalent(rawTotals, requirement);

  const totalRaw = Object.values(rawTotals).reduce((sum, quantity) => sum + quantity, 0); const tickRate = createRuntimeServices().config.tickRate; const heroCycleTicks = getProductionTierRules(3).gatheringBaseTicks;
  const workerTask = WORKER_TASK_DEFINITIONS.find((task) => task.resourceTier === 3); if (workerTask === undefined) throw new Error("Missing T3 worker task");
  const heroPerSecond = tickRate / heroCycleTicks; const workerPerSecond = tickRate / workerTask.durationTicks * workerTask.baseYield;
  const oneWorker = secondsWithOneDedicatedWorker(rawTotals, heroPerSecond, workerPerSecond);
  const workerRecruitmentCost = getInitialIslandWorkerHouseLevelDefinition().recruitmentCost;
  return {
    targetItemId,
    workshopFamilies: workshopFamilies.join(" + "),
    buildings: [...requiredBuildings].join(" -> "),
    buildingSilverCost,
    guidedSilverCostWithOneWorker: buildingSilverCost + workerRecruitmentCost,
    rawWood: rawTotals.wood,
    rawOre: rawTotals.ore,
    rawHide: rawTotals.hide,
    rawFiber: rawTotals.fiber,
    totalRaw,
    gatherSecondsHeroOnly: Math.round(totalRaw / heroPerSecond * 10) / 10,
    gatherSecondsHeroPlusOneWorker: Math.round(oneWorker.seconds * 10) / 10,
    bestWorkerFamily: oneWorker.family,
  };
}

function getFullT3InfrastructureSilverCost(): number {
  const constructibleProductionBuildings = PLAYER_ISLAND_CONFIG.buildings.filter((definition) => definition.construction !== undefined);
  const buildingCost = constructibleProductionBuildings.reduce((sum, definition) => sum + (definition.construction?.silver ?? 0), 0);
  const workerHouse = getInitialIslandWorkerHouseLevelDefinition();
  return buildingCost + workerHouse.workerCapacity * workerHouse.recruitmentCost;
}

describe("T3 onboarding economy benchmark", () => {
  it("prints the current data-driven cost and gather-time envelope for the first T3 craft", () => {
    const rows = T3_TARGETS.map(buildScenario);
    const fullT3InfrastructureSilverCost = getFullT3InfrastructureSilverCost();
    console.table(rows);
    console.info("[T3_ONBOARDING_BENCHMARK]", JSON.stringify({
      runtimeTickRate: createRuntimeServices().config.tickRate,
      heroT3GatherCycleTicks: getProductionTierRules(3).gatheringBaseTicks,
      workerT3GatherCycleTicks: WORKER_TASK_DEFINITIONS.find((task) => task.resourceTier === 3)?.durationTicks,
      workerRecruitmentCost: getInitialIslandWorkerHouseLevelDefinition().recruitmentCost,
      fullT3InfrastructureSilverCost,
      rows,
    }, null, 2));
    expect(rows).toHaveLength(T3_TARGETS.length);
    expect(rows.every((row) => row.totalRaw > 0)).toBe(true);
    expect(rows.every((row) => row.buildingSilverCost > 0)).toBe(true);
    expect(fullT3InfrastructureSilverCost).toBe(2200);
  });
  it("keeps level-1 island access to the complete T3 production chain", () => { const levelOne = getIslandLevelDefinition(1); expect(levelOne?.unlockedCategories).toEqual(expect.arrayContaining(["gathering", "refining", "crafting"])); });
  it("keeps the workshop flexible and data-driven", () => { const workshop = getIslandBuildingDefinition("workshop").construction; expect(workshop?.flexibleRequirement?.totalQuantity).toBe(6); expect(workshop?.flexibleRequirement?.minimumDistinctItemIds).toBe(2); expect(workshop?.prerequisiteBuildings).toBeUndefined(); expect(PLAYER_ISLAND_CONFIG.buildings).toContain(getIslandBuildingDefinition("workshop")); });
});
