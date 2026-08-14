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

  it("round-trips persisted island state", () => {
    const source = new PlayerIslandService();
    const snapshot = source.save();
    const restored = new PlayerIslandService();

    restored.load(snapshot);

    expect(restored.getState()).toEqual(source.getState());
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
