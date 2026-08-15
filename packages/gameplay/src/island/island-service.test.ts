import { describe, expect, it } from "vitest";
import { PLAYER_ISLAND_CONFIG } from "@game/data";
import { PlayerIslandService } from "./island-service.js";

describe("PlayerIslandService", () => {
  it("builds its initial state exclusively from the island data config", () => {
    const service = new PlayerIslandService();
    const state = service.getState();

    expect(state.level).toBe(1);
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

  it("caps building upgrades at the current island level", () => {
    const service = new PlayerIslandService();
    service.placeBuilding("lumber_camp", "plot_03");
    service.placeBuilding("mine", "plot_04");
    service.placeBuilding("hunting_camp", "plot_05");
    service.placeBuilding("fiber_camp", "plot_06");

    expect(service.upgradeBuilding("mine")).toEqual({ ok: false, reason: "island_level_required" });

    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.upgradeBuilding("mine")).toEqual({
      ok: true,
      building: {
        instanceId: "island_mine",
        definitionId: "mine",
        plotId: "plot_04",
        level: 2,
      },
    });
    expect(service.upgradeBuilding("mine")).toEqual({ ok: false, reason: "island_level_required" });
  });

  it("does not create upgrades for utility buildings without authored progression", () => {
    const service = new PlayerIslandService();
    expect(service.upgradeBuilding("worker_house")).toEqual({ ok: false, reason: "unauthored_level" });
    expect(service.upgradeBuilding("storage")).toEqual({ ok: false, reason: "unauthored_level" });
  });

  it("requires real island development before raising the island level", () => {
    const service = new PlayerIslandService();

    expect(service.canUpgradeIslandLevel()).toEqual({ ok: false, reason: "requirements_not_met" });

    service.placeBuilding("lumber_camp", "plot_03");
    service.placeBuilding("mine", "plot_04");
    service.placeBuilding("hunting_camp", "plot_05");
    service.placeBuilding("fiber_camp", "plot_06");

    expect(service.canUpgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.getState().level).toBe(2);
  });

  it("supports the authored Lv1 to Lv3 development path without circular gates", () => {
    const service = new PlayerIslandService();
    service.placeBuilding("lumber_camp", "plot_03");
    service.placeBuilding("mine", "plot_04");
    service.placeBuilding("hunting_camp", "plot_05");
    service.placeBuilding("fiber_camp", "plot_06");
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 2 });

    service.placeBuilding("sawmill", "plot_07");
    service.placeBuilding("smelter", "plot_08");
    service.placeBuilding("tannery", "plot_09");
    service.placeBuilding("weaver", "plot_10");
    service.upgradeBuilding("lumber_camp");
    service.upgradeBuilding("mine");
    service.upgradeBuilding("hunting_camp");
    service.upgradeBuilding("fiber_camp");

    expect(service.canUpgradeIslandLevel()).toEqual({ ok: true, level: 3 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 3 });
    expect(service.upgradeBuilding("lumber_camp").ok).toBe(true);
    expect(service.getBuildingLevel("lumber_camp")).toBe(3);
    expect(service.upgradeIslandLevel()).toEqual({ ok: false, reason: "max_level" });
  });

  it("round-trips persisted island state after construction, building upgrade and island upgrade", () => {
    const source = new PlayerIslandService();
    source.placeBuilding("lumber_camp", "plot_03");
    source.placeBuilding("mine", "plot_04");
    source.placeBuilding("hunting_camp", "plot_05");
    source.placeBuilding("fiber_camp", "plot_06");
    source.upgradeIslandLevel();
    source.upgradeBuilding("lumber_camp");
    source.upgradeBuilding("mine");
    const snapshot = source.save();
    const restored = new PlayerIslandService();

    restored.load(snapshot);

    expect(restored.getState()).toEqual(source.getState());
    expect(restored.getState().level).toBe(2);
  });

  it("migrates an older snapshot by defaulting its island level and appending newly authored plots", () => {
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

    expect(service.getState().level).toBe(1);
    expect(service.getState().buildings.some((building) => building.definitionId === "mine")).toBe(true);
    expect(service.getState().plots).toHaveLength(PLAYER_ISLAND_CONFIG.plots.length);
    expect(service.getState().plots.find((plot) => plot.id === "plot_09")?.buildingInstanceId).toBeNull();
  });

  it("clamps pre-gate snapshots whose building level exceeds the island level", () => {
    const service = new PlayerIslandService();
    service.load({
      version: 1,
      level: 1,
      plots: [
        { id: "plot_01", buildingInstanceId: "island_worker_house" },
        { id: "plot_02", buildingInstanceId: "island_storage" },
        { id: "plot_03", buildingInstanceId: "island_lumber_camp" },
      ],
      buildings: [
        { instanceId: "island_worker_house", definitionId: "worker_house", plotId: "plot_01", level: 1 },
        { instanceId: "island_storage", definitionId: "storage", plotId: "plot_02", level: 1 },
        { instanceId: "island_lumber_camp", definitionId: "lumber_camp", plotId: "plot_03", level: 3 },
      ],
    });

    expect(service.getState().level).toBe(1);
    expect(service.getBuildingLevel("lumber_camp")).toBe(1);
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
