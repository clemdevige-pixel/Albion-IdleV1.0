import { describe, expect, it } from "vitest";
import { PlayerIslandService } from "./island-service.js";

describe("Academy island progression", () => {
  it("synchronizes the Academy tier automatically with Island Level", () => {
    const service = new PlayerIslandService();
    service.upgradeIslandLevel();
    expect(service.getState().level).toBe(2);
    expect(service.placeBuilding("academy", "plot_03").ok).toBe(true);
    expect(service.getBuildingLevel("academy")).toBe(1);
    expect(service.upgradeBuilding("academy")).toEqual({ ok: false, reason: "max_level" });

    service.upgradeIslandLevel();
    expect(service.getState().level).toBe(3);
    expect(service.getBuildingLevel("academy")).toBe(2);
    expect(service.upgradeBuilding("academy")).toEqual({ ok: false, reason: "max_level" });
  });

  it("builds a late Academy directly at the tier already paid through Island Level", () => {
    const service = new PlayerIslandService();
    service.upgradeIslandLevel();
    service.upgradeIslandLevel();
    service.upgradeIslandLevel();
    expect(service.getState().level).toBe(4);

    expect(service.placeBuilding("academy", "plot_03")).toMatchObject({
      ok: true,
      building: { definitionId: "academy", level: 3 },
    });
  });

  it("migrates a saved Academy to the tier owned by Island Level", () => {
    const service = new PlayerIslandService();
    service.load({
      version: 1,
      level: 4,
      plots: [
        { id: "plot_01", buildingInstanceId: "island_worker_house" },
        { id: "plot_02", buildingInstanceId: "island_storage" },
        { id: "plot_03", buildingInstanceId: "island_academy" },
      ],
      buildings: [
        { instanceId: "island_worker_house", definitionId: "worker_house", plotId: "plot_01", level: 1 },
        { instanceId: "island_storage", definitionId: "storage", plotId: "plot_02", level: 1 },
        { instanceId: "island_academy", definitionId: "academy", plotId: "plot_03", level: 1 },
      ],
    });

    expect(service.getState().level).toBe(4);
    expect(service.getBuildingLevel("academy")).toBe(3);
  });
});
