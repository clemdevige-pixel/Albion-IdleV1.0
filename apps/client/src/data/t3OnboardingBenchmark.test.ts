import { describe, expect, it } from "vitest";
import {
  PLAYER_ISLAND_CONFIG,
  getInitialIslandWorkerHouseLevelDefinition,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
} from "@game/data";

function getFullT3InfrastructureSilverCost(): number {
  const constructibleProductionBuildings = PLAYER_ISLAND_CONFIG.buildings.filter((definition) => (
    definition.construction !== undefined
    && (definition.category === "gathering" || definition.category === "refining" || definition.category === "crafting")
  ));
  const buildingCost = constructibleProductionBuildings.reduce(
    (sum, definition) => sum + (definition.construction?.silver ?? 0),
    0,
  );
  const workerHouse = getInitialIslandWorkerHouseLevelDefinition();
  return buildingCost + workerHouse.workerCapacity * workerHouse.recruitmentCost;
}

describe("T3 onboarding contracts", () => {
  it("keeps the complete initial T3 infrastructure cost at the validated 2200 silver", () => {
    expect(getFullT3InfrastructureSilverCost()).toBe(2200);
  });

  it("keeps level-1 island access to the complete T3 production chain", () => {
    const levelOne = getIslandLevelDefinition(1);
    expect(levelOne?.unlockedCategories).toEqual(
      expect.arrayContaining(["gathering", "refining", "crafting"]),
    );
  });

  it("keeps the workshop fixed and data-driven", () => {
    const workshop = getIslandBuildingDefinition("workshop").construction;
    expect(workshop?.requirements).toEqual([
      { itemId: "item_refined_planks_t3", quantity: 2 },
      { itemId: "item_refined_copper_bar_t3", quantity: 2 },
      { itemId: "item_refined_leather_t3", quantity: 2 },
      { itemId: "item_refined_cloth_t3", quantity: 2 },
    ]);
    expect(workshop?.flexibleRequirement).toBeUndefined();
    expect(workshop?.prerequisiteBuildings).toBeUndefined();
    expect(PLAYER_ISLAND_CONFIG.buildings).toContain(getIslandBuildingDefinition("workshop"));
  });
});
