import { describe, expect, it } from "vitest";
import { createRuntimeServices } from "@game/core";
import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
import {
  EQUIPMENT_CRAFT_RECIPES,
  getProductionRefiningRecipe,
} from "./refiningRecipes.js";
import {
  getProductionTierRules,
  type ProductionFamilyId,
} from "./productionFamilyCatalog.js";
import { WORKER_TASK_DEFINITIONS } from "./workerContentCatalog.js";

const T3_TARGETS = [
  "item_iron_helmet",
  "item_leather_armor",
  "item_leather_boots",
  "item_shield_t3_reinforced",
] as const;

const T3_FAMILIES: readonly ProductionFamilyId[] = ["wood", "ore", "hide", "fiber"];

interface MaterialRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

interface T3OnboardingRow {
  readonly targetItemId: string;
  readonly buildings: string;
  readonly silverCost: number;
  readonly rawWood: number;
  readonly rawOre: number;
  readonly rawHide: number;
  readonly rawFiber: number;
  readonly totalRaw: number;
  readonly gatherSecondsHeroOnly: number;
  readonly gatherSecondsHeroPlusOneWorker: number;
}

const RAW_ITEM_TO_FAMILY = new Map<string, ProductionFamilyId>(
  T3_FAMILIES.map((family) => [getProductionRefiningRecipe(family, 3).rawItemId, family] as const),
);
const REFINED_ITEM_TO_FAMILY = new Map<string, ProductionFamilyId>(
  T3_FAMILIES.map((family) => [getProductionRefiningRecipe(family, 3).outputItemId, family] as const),
);

function collectRequiredBuildings(buildingId: IslandBuildingId, output: Set<IslandBuildingId>): void {
  if (output.has(buildingId)) return;
  const definition = getIslandBuildingDefinition(buildingId);
  for (const prerequisite of definition.construction?.prerequisiteBuildings ?? []) {
    collectRequiredBuildings(prerequisite, output);
  }
  output.add(buildingId);
}

function addRawEquivalent(
  totals: Record<ProductionFamilyId, number>,
  requirement: MaterialRequirement,
): void {
  const rawFamily = RAW_ITEM_TO_FAMILY.get(requirement.itemId);
  if (rawFamily !== undefined) {
    totals[rawFamily] += requirement.quantity;
    return;
  }

  const refinedFamily = REFINED_ITEM_TO_FAMILY.get(requirement.itemId);
  if (refinedFamily !== undefined) {
    const recipe = getProductionRefiningRecipe(refinedFamily, 3);
    for (const refiningInput of recipe.requirements) {
      addRawEquivalent(totals, {
        itemId: refiningInput.itemId,
        quantity: refiningInput.quantity * requirement.quantity,
      });
    }
  }
}

function buildScenario(targetItemId: string): T3OnboardingRow {
  const recipe = EQUIPMENT_CRAFT_RECIPES.find((entry) => entry.outputItemId === targetItemId);
  if (recipe === undefined) throw new Error(`Missing T3 craft recipe for ${targetItemId}`);

  const requiredBuildings = new Set<IslandBuildingId>();
  collectRequiredBuildings("workshop", requiredBuildings);

  // Add the refining building for every refined family used directly by the target recipe.
  const refiningBuildingByFamily: Readonly<Record<ProductionFamilyId, IslandBuildingId>> = {
    wood: "sawmill",
    ore: "smelter",
    hide: "tannery",
    fiber: "weaver",
  };
  for (const requirement of recipe.requirements) {
    const family = REFINED_ITEM_TO_FAMILY.get(requirement.itemId);
    if (family !== undefined) collectRequiredBuildings(refiningBuildingByFamily[family], requiredBuildings);
  }

  const rawTotals: Record<ProductionFamilyId, number> = { wood: 0, ore: 0, hide: 0, fiber: 0 };
  let silverCost = 0;

  for (const buildingId of requiredBuildings) {
    const construction = getIslandBuildingDefinition(buildingId).construction;
    if (construction === undefined) continue;
    silverCost += construction.silver;
    for (const requirement of construction.requirements) addRawEquivalent(rawTotals, requirement);
  }
  for (const requirement of recipe.requirements) addRawEquivalent(rawTotals, requirement);

  const totalRaw = Object.values(rawTotals).reduce((sum, quantity) => sum + quantity, 0);
  const tickRate = createRuntimeServices().config.tickRate;
  const heroCycleTicks = getProductionTierRules(3).gatheringBaseTicks;
  const workerTask = WORKER_TASK_DEFINITIONS.find((task) => task.resourceTier === 3);
  if (workerTask === undefined) throw new Error("Missing T3 worker task");

  const heroPerSecond = tickRate / heroCycleTicks;
  const workerPerSecond = tickRate / workerTask.durationTicks * workerTask.baseYield;
  const heroOnlySeconds = totalRaw / heroPerSecond;
  const heroPlusWorkerSeconds = totalRaw / (heroPerSecond + workerPerSecond);

  return {
    targetItemId,
    buildings: [...requiredBuildings].join(" -> "),
    silverCost,
    rawWood: rawTotals.wood,
    rawOre: rawTotals.ore,
    rawHide: rawTotals.hide,
    rawFiber: rawTotals.fiber,
    totalRaw,
    gatherSecondsHeroOnly: Math.round(heroOnlySeconds * 10) / 10,
    gatherSecondsHeroPlusOneWorker: Math.round(heroPlusWorkerSeconds * 10) / 10,
  };
}

describe("T3 onboarding economy benchmark", () => {
  it("prints the current data-driven cost and gather-time envelope for the first T3 craft", () => {
    const rows = T3_TARGETS.map(buildScenario);

    console.table(rows);
    console.info("[T3_ONBOARDING_BENCHMARK]", JSON.stringify({
      runtimeTickRate: createRuntimeServices().config.tickRate,
      heroT3GatherCycleTicks: getProductionTierRules(3).gatheringBaseTicks,
      workerT3GatherCycleTicks: WORKER_TASK_DEFINITIONS.find((task) => task.resourceTier === 3)?.durationTicks,
      rows,
    }, null, 2));

    expect(rows).toHaveLength(T3_TARGETS.length);
    expect(rows.every((row) => row.totalRaw > 0)).toBe(true);
    expect(rows.every((row) => row.silverCost > 0)).toBe(true);
  });

  it("keeps level-1 island access to the complete T3 production chain", () => {
    const levelOne = (await import("@game/data")).getIslandLevelDefinition(1);
    expect(levelOne?.unlockedCategories).toEqual(
      expect.arrayContaining(["gathering", "refining", "crafting"]),
    );
  });

  it("keeps the authored island catalog as the construction source of truth", () => {
    expect(PLAYER_ISLAND_CONFIG.buildings).toContain(getIslandBuildingDefinition("workshop"));
  });
});
