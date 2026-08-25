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

  it("moves a built building to an empty plot without changing its identity or level", () => {
    const service = new PlayerIslandService();
    service.placeBuilding("mine", "plot_03");
    const before = service.getState().buildings.find((building) => building.definitionId === "mine");

    expect(service.moveBuilding("island_mine", "plot_04")).toEqual({
      ok: true,
      building: {
        instanceId: "island_mine",
        definitionId: "mine",
        plotId: "plot_04",
        level: 1,
      },
    });

    const after = service.getState().buildings.find((building) => building.definitionId === "mine");
    expect(after?.instanceId).toBe(before?.instanceId);
    expect(after?.level).toBe(before?.level);
    expect(service.getState().plots.find((plot) => plot.id === "plot_03")?.buildingInstanceId).toBeNull();
    expect(service.getState().plots.find((plot) => plot.id === "plot_04")?.buildingInstanceId).toBe("island_mine");
  });

  it("swaps two occupied plots atomically while preserving both buildings", () => {
    const service = new PlayerIslandService();
    service.placeBuilding("mine", "plot_03");

    expect(service.moveBuilding("island_mine", "plot_02")).toEqual({
      ok: true,
      building: {
        instanceId: "island_mine",
        definitionId: "mine",
        plotId: "plot_02",
        level: 1,
      },
      swappedBuilding: {
        instanceId: "island_storage",
        definitionId: "storage",
        plotId: "plot_03",
        level: 1,
      },
    });

    expect(service.getState().plots.find((plot) => plot.id === "plot_02")?.buildingInstanceId).toBe("island_mine");
    expect(service.getState().plots.find((plot) => plot.id === "plot_03")?.buildingInstanceId).toBe("island_storage");
    expect(service.getState().buildings.find((building) => building.instanceId === "island_storage")?.plotId).toBe("plot_03");
  });

  it("rejects relocation requests for unknown buildings or plots", () => {
    const service = new PlayerIslandService();
    expect(service.moveBuilding("missing", "plot_03")).toEqual({ ok: false, reason: "unknown_building" });
    expect(service.moveBuilding("island_storage", "missing")).toEqual({ ok: false, reason: "unknown_plot" });
  });

  it("keeps standard production buildings construction-only at every island level", () => {
    const service = new PlayerIslandService();
    service.placeBuilding("mine", "plot_03");

    expect(service.upgradeBuilding("mine")).toEqual({ ok: false, reason: "unauthored_level" });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.upgradeBuilding("mine")).toEqual({ ok: false, reason: "unauthored_level" });
    expect(service.getBuildingLevel("mine")).toBe(1);
  });

  it("does not create upgrades for utility buildings without authored progression", () => {
    const service = new PlayerIslandService();
    expect(service.upgradeBuilding("worker_house")).toEqual({ ok: false, reason: "unauthored_level" });
    expect(service.upgradeBuilding("storage")).toEqual({ ok: false, reason: "unauthored_level" });
  });

  it("synchronizes Academy progression through Island Level instead of manual upgrades", () => {
    const service = new PlayerIslandService();
    service.upgradeIslandLevel();
    expect(service.placeBuilding("academy", "plot_03")).toMatchObject({
      ok: true,
      building: { level: 1 },
    });

    expect(service.upgradeBuilding("academy")).toEqual({ ok: false, reason: "max_level" });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 3 });
    expect(service.getBuildingLevel("academy")).toBe(2);
  });

  it("leaves world progression gating to the island action layer", () => {
    const service = new PlayerIslandService();

    expect(service.canUpgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.getState().level).toBe(2);
  });

  it("supports the authored Lv1 to Lv6 island path without production-building upgrades", () => {
    const service = new PlayerIslandService();
    service.placeBuilding("lumber_camp", "plot_03");
    service.placeBuilding("mine", "plot_04");
    service.placeBuilding("hunting_camp", "plot_05");
    service.placeBuilding("fiber_camp", "plot_06");
    service.placeBuilding("sawmill", "plot_07");
    service.placeBuilding("smelter", "plot_08");
    service.placeBuilding("tannery", "plot_09");
    service.placeBuilding("weaver", "plot_10");
    service.placeBuilding("workshop", "plot_11");

    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 2 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 3 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 4 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 5 });
    expect(service.upgradeIslandLevel()).toEqual({ ok: true, level: 6 });

    for (const buildingId of [
      "lumber_camp",
      "mine",
      "hunting_camp",
      "fiber_camp",
      "sawmill",
      "smelter",
      "tannery",
      "weaver",
      "workshop",
    ] as const) {
      expect(service.getBuildingLevel(buildingId)).toBe(1);
      expect(service.upgradeBuilding(buildingId)).toEqual({ ok: false, reason: "unauthored_level" });
    }
    expect(service.upgradeIslandLevel()).toEqual({ ok: false, reason: "max_level" });
  });

  it("round-trips persisted island state after construction, relocation and island upgrade", () => {
    const source = new PlayerIslandService();
    source.placeBuilding("lumber_camp", "plot_03");
    source.placeBuilding("mine", "plot_04");
    source.moveBuilding("island_mine", "plot_05");
    source.moveBuilding("island_lumber_camp", "plot_02");
    source.upgradeIslandLevel();
    const snapshot = source.save();
    const restored = new PlayerIslandService();

    restored.load(snapshot);

    expect(restored.getState()).toEqual(source.getState());
    expect(restored.getState().level).toBe(2);
    expect(restored.getState().buildings.find((building) => building.instanceId === "island_mine")?.plotId).toBe("plot_05");
    expect(restored.getState().buildings.find((building) => building.instanceId === "island_lumber_camp")?.plotId).toBe("plot_02");
    expect(restored.getState().buildings.find((building) => building.instanceId === "island_storage")?.plotId).toBe("plot_03");
  });

  it("round-trips the highest authored island level", () => {
    const source = new PlayerIslandService();
    source.upgradeIslandLevel();
    source.upgradeIslandLevel();
    source.upgradeIslandLevel();
    source.upgradeIslandLevel();
    source.upgradeIslandLevel();
    expect(source.getState().level).toBe(6);

    const restored = new PlayerIslandService();
    restored.load(source.save());

    expect(restored.getState().level).toBe(6);
    expect(restored.getState()).toEqual(source.getState());
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

  it("collapses legacy production-building levels while preserving the island level", () => {
    const service = new PlayerIslandService();
    service.load({
      version: 1,
      level: 4,
      plots: [
        { id: "plot_01", buildingInstanceId: "island_worker_house" },
        { id: "plot_02", buildingInstanceId: "island_storage" },
        { id: "plot_03", buildingInstanceId: "island_lumber_camp" },
      ],
      buildings: [
        { instanceId: "island_worker_house", definitionId: "worker_house", plotId: "plot_01", level: 1 },
        { instanceId: "island_storage", definitionId: "storage", plotId: "plot_02", level: 1 },
        { instanceId: "island_lumber_camp", definitionId: "lumber_camp", plotId: "plot_03", level: 4 },
      ],
    });

    expect(service.getState().level).toBe(4);
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
