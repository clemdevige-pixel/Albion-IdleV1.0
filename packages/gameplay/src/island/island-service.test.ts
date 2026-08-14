import { describe, expect, it } from "vitest";
import { PLAYER_ISLAND_CONFIG } from "@game/data";
import { PlayerIslandService } from "./island-service.js";

describe("PlayerIslandService", () => {
  it("builds its initial state exclusively from the island data config", () => {
    const service = new PlayerIslandService();
    const state = service.getState();

    expect(state.plots.map((plot) => plot.id)).toEqual(
      PLAYER_ISLAND_CONFIG.plots.map((plot) => plot.id),
    );
    expect(state.buildings).toEqual(PLAYER_ISLAND_CONFIG.initialBuildings);
  });

  it("places a building deterministically on a free plot", () => {
    const service = new PlayerIslandService();
    const result = service.placeBuilding("mine", "plot_03");

    expect(result).toEqual({
      ok: true,
      building: {
        instanceId: "island_mine",
        definitionId: "mine",
        plotId: "plot_03",
        level: 1,
      },
    });
    expect(service.getState().plots.find((plot) => plot.id === "plot_03")?.buildingInstanceId)
      .toBe("island_mine");
  });

  it("rejects duplicate buildings and occupied plots", () => {
    const service = new PlayerIslandService();
    expect(service.placeBuilding("mine", "plot_03").ok).toBe(true);
    expect(service.placeBuilding("mine", "plot_04")).toEqual({ ok: false, reason: "already_built" });
    expect(service.placeBuilding("lumber_camp", "plot_03")).toEqual({ ok: false, reason: "plot_occupied" });
  });

  it("round-trips persisted island state after construction", () => {
    const source = new PlayerIslandService();
    source.placeBuilding("mine", "plot_03");
    const snapshot = source.save();
    const restored = new PlayerIslandService();

    restored.load(snapshot);

    expect(restored.getState()).toEqual(source.getState());
  });

  it("migrates an older snapshot by appending newly authored plots", () => {
    const service = new PlayerIslandService();
    service.load({
      version: 1,
      plots: [
        { id: "plot_01", buildingInstanceId: "island_worker_house" },
        { id: "plot_02", buildingInstanceId: "island_storage" },
        { id: "plot_03", buildingInstanceId: "island_mine" },
        { id: "plot_04", buildingInstanceId: null },
        { id: "plot_05", buildingInstanceId: null },
        { id: "plot_06", buildingInstanceId: null },
        { id: "plot_07", buildingInstanceId: null },
        { id: "plot_08", buildingInstanceId: null },
      ],
      buildings: [
        { instanceId: "island_worker_house", definitionId: "worker_house", plotId: "plot_01", level: 1 },
        { instanceId: "island_storage", definitionId: "storage", plotId: "plot_02", level: 1 },
        { instanceId: "island_mine", definitionId: "mine", plotId: "plot_03", level: 1 },
      ],
    });

    expect(service.getState().buildings.some((building) => building.definitionId === "mine")).toBe(true);
    expect(service.getState().plots).toHaveLength(PLAYER_ISLAND_CONFIG.plots.length);
    expect(service.getState().plots.find((plot) => plot.id === "plot_09")?.buildingInstanceId).toBeNull();
  });

  it("ignores snapshots containing unknown plots", () => {
    const service = new PlayerIslandService();
    const initialState = service.getState();

    service.load({
      version: 1,
      plots: [{ id: "unknown_plot", buildingInstanceId: null }],
      buildings: [],
    });

    expect(service.getState()).toEqual(initialState);
  });
});
