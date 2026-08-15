import { describe, expect, it } from "vitest";
import {
  PLAYER_ISLAND_CONFIG,
  getInitialIslandStorageLevelDefinition,
  getInitialIslandWorkerHouseLevelDefinition,
} from "../config/island.js";

describe("player island config", () => {
  it("resolves initial utility building baselines from authored island data", () => {
    const workerHouse = PLAYER_ISLAND_CONFIG.initialBuildings.find(
      (building) => building.definitionId === "worker_house",
    );
    const storage = PLAYER_ISLAND_CONFIG.initialBuildings.find(
      (building) => building.definitionId === "storage",
    );

    expect(workerHouse).toBeDefined();
    expect(storage).toBeDefined();
    expect(getInitialIslandWorkerHouseLevelDefinition().level).toBe(workerHouse?.level);
    expect(getInitialIslandStorageLevelDefinition().level).toBe(storage?.level);
    expect(getInitialIslandStorageLevelDefinition().capacity).toBe(256);
  });

  it("keeps initial building placements unique", () => {
    const plotIds = PLAYER_ISLAND_CONFIG.initialBuildings.map((building) => building.plotId);
    const instanceIds = PLAYER_ISLAND_CONFIG.initialBuildings.map((building) => building.instanceId);

    expect(new Set(plotIds).size).toBe(plotIds.length);
    expect(new Set(instanceIds).size).toBe(instanceIds.length);
  });

  it("provides enough plots for every planned building", () => {
    expect(PLAYER_ISLAND_CONFIG.plots.length).toBeGreaterThanOrEqual(
      PLAYER_ISLAND_CONFIG.buildings.length,
    );
  });

  it("maps every gathering building to one authored production family and profession", () => {
    const gatheringBuildings = PLAYER_ISLAND_CONFIG.buildings.filter(
      (building) => building.category === "gathering",
    );

    expect(gatheringBuildings).toHaveLength(4);
    expect(gatheringBuildings.map((building) => building.gatheringService)).toEqual([
      { productionFamily: "wood", workerProfession: "woodcutter" },
      { productionFamily: "ore", workerProfession: "miner" },
      { productionFamily: "hide", workerProfession: "skinner" },
      { productionFamily: "fiber", workerProfession: "fiber_harvester" },
    ]);
  });

  it("maps each refining building to its production family and gathering prerequisite", () => {
    const refiningBuildings = PLAYER_ISLAND_CONFIG.buildings.filter(
      (building) => building.category === "refining",
    );

    expect(refiningBuildings).toHaveLength(4);
    expect(refiningBuildings.map((building) => ({
      id: building.id,
      service: building.refiningService,
      prerequisites: building.construction?.prerequisiteBuildings,
    }))).toEqual([
      { id: "sawmill", service: { productionFamily: "wood" }, prerequisites: ["lumber_camp"] },
      { id: "smelter", service: { productionFamily: "ore" }, prerequisites: ["mine"] },
      { id: "tannery", service: { productionFamily: "hide" }, prerequisites: ["hunting_camp"] },
      { id: "weaver", service: { productionFamily: "fiber" }, prerequisites: ["fiber_camp"] },
    ]);
  });

  it("authors the workshop as a shared flexible crafting building", () => {
    const workshop = PLAYER_ISLAND_CONFIG.buildings.find(
      (building) => building.id === "workshop",
    );

    expect(workshop?.craftingService?.categories).toEqual(["weapons", "armors", "other"]);
    expect(workshop?.construction?.prerequisiteBuildings).toBeUndefined();
    expect(workshop?.construction?.flexibleRequirement).toEqual({
      itemIds: [
        "item_refined_planks_t3",
        "item_refined_copper_bar_t3",
        "item_refined_leather_t3",
        "item_refined_cloth_t3",
      ],
      totalQuantity: 6,
      minimumDistinctItemIds: 2,
    });
  });

  it("keeps construction costs authored and positive", () => {
    const constructible = PLAYER_ISLAND_CONFIG.buildings.filter(
      (building) => building.construction !== undefined,
    );

    expect(constructible.length).toBeGreaterThan(0);
    for (const building of constructible) {
      const construction = building.construction;
      expect(construction?.silver).toBeGreaterThan(0);
      const fixedRequirements = construction?.requirements.length ?? 0;
      const flexibleRequirements = construction?.flexibleRequirement?.totalQuantity ?? 0;
      expect(fixedRequirements + flexibleRequirements).toBeGreaterThan(0);
      for (const requirement of construction?.requirements ?? []) {
        expect(requirement.quantity).toBeGreaterThan(0);
      }
      if (construction?.flexibleRequirement !== undefined) {
        expect(construction.flexibleRequirement.itemIds.length).toBeGreaterThan(0);
        expect(construction.flexibleRequirement.totalQuantity).toBeGreaterThan(0);
        expect(construction.flexibleRequirement.minimumDistinctItemIds).toBeGreaterThan(0);
      }
    }
  });
});
