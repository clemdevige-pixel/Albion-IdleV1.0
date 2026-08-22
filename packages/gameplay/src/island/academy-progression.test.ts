import { describe, expect, it } from "vitest";
import { PlayerIslandService } from "./island-service.js";

describe("Academy island progression", () => {
  it("requires the next Island Level before each Academy tier upgrade", () => {
    const service = new PlayerIslandService();
    service.upgradeIslandLevel();
    expect(service.getState().level).toBe(2);
    expect(service.placeBuilding("academy", "plot_03").ok).toBe(true);
    expect(service.getBuildingLevel("academy")).toBe(1);

    expect(service.upgradeBuilding("academy")).toEqual({
      ok: false,
      reason: "island_level_required",
    });

    service.upgradeIslandLevel();
    expect(service.getState().level).toBe(3);
    expect(service.upgradeBuilding("academy")).toMatchObject({
      ok: true,
      building: { definitionId: "academy", level: 2 },
    });
  });

  it("clamps an impossible saved Academy level to the highest tier allowed by Island Level", () => {
    const service = new PlayerIslandService();
    service.load({
      version: 1,
      level: 2,
      plots: [
        { id: "plot_01", buildingInstanceId: "island_worker_house" },
        { id: "plot_02", buildingInstanceId: "island_storage" },
        { id: "plot_03", buildingInstanceId: "island_academy" },
      ],
      buildings: [
        { instanceId: "island_worker_house", definitionId: "worker_house", plotId: "plot_01", level: 1 },
        { instanceId: "island_storage", definitionId: "storage", plotId: "plot_02", level: 1 },
        { instanceId: "island_academy", definitionId: "academy", plotId: "plot_03", level: 5 },
      ],
    });

    expect(service.getState().level).toBe(2);
    expect(service.getBuildingLevel("academy")).toBe(1);
  });
});
