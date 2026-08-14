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

  it("keeps construction costs authored and positive", () => {
    const constructible = PLAYER_ISLAND_CONFIG.buildings.filter(
      (building) => building.construction !== undefined,
    );

    expect(constructible.length).toBeGreaterThan(0);
    for (const building of constructible) {
      expect(building.construction?.silver).toBeGreaterThan(0);
      expect(building.construction?.requirements.length).toBeGreaterThan(0);
      for (const requirement of building.construction?.requirements ?? []) {
        expect(requirement.quantity).toBeGreaterThan(0);
      }
    }
  });
});
