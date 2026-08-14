import { describe, expect, it } from "vitest";
import {
  PLAYER_ISLAND_CONFIG,
  getInitialIslandWorkerHouseLevelDefinition,
} from "../config/island.js";

describe("player island config", () => {
  it("resolves the initial worker house baseline from authored island data", () => {
    const workerHouse = PLAYER_ISLAND_CONFIG.initialBuildings.find(
      (building) => building.definitionId === "worker_house",
    );

    expect(workerHouse).toBeDefined();
    expect(getInitialIslandWorkerHouseLevelDefinition().level).toBe(workerHouse?.level);
  });

  it("keeps initial building placements unique", () => {
    const plotIds = PLAYER_ISLAND_CONFIG.initialBuildings.map((building) => building.plotId);
    const instanceIds = PLAYER_ISLAND_CONFIG.initialBuildings.map((building) => building.instanceId);

    expect(new Set(plotIds).size).toBe(plotIds.length);
    expect(new Set(instanceIds).size).toBe(instanceIds.length);
  });
});
