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
});
