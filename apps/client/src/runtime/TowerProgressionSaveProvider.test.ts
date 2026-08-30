import { describe, expect, it } from "vitest";
import { TowerProgressionService } from "@game/gameplay";
import { TowerProgressionSaveProvider } from "./TowerProgressionSaveProvider.js";

describe("TowerProgressionSaveProvider", () => {
  it("round-trips Tower progression including seed and checkpoint", () => {
    const source = new TowerProgressionService("source-seed");
    for (let floor = 1; floor <= 7; floor += 1) source.clearCurrentFloor(floor);
    const provider = new TowerProgressionSaveProvider(source, "fallback-seed");

    const restored = new TowerProgressionService("fresh-seed");
    const restoredProvider = new TowerProgressionSaveProvider(restored, "fallback-seed");
    restoredProvider.load(provider.save());

    expect(restored.getSnapshot()).toEqual(source.getSnapshot());
  });

  it("resets to a stable fallback for missing legacy provider data", () => {
    const service = new TowerProgressionService("temporary-seed");
    service.clearCurrentFloor(1);
    const provider = new TowerProgressionSaveProvider(service, "legacy-fallback");

    provider.load(undefined);

    expect(service.getSnapshot()).toEqual({
      seed: "legacy-fallback",
      currentFloor: 1,
      highestClearedFloor: 0,
      checkpointFloor: 1,
      endlessUnlocked: false,
    });
  });

  it("does not let malformed Tower data fail the global save load", () => {
    const service = new TowerProgressionService("temporary-seed");
    const provider = new TowerProgressionSaveProvider(service, "safe-fallback");

    expect(() => provider.load({
      seed: "corrupted",
      currentFloor: 99,
      highestClearedFloor: 7,
      checkpointFloor: 1,
      endlessUnlocked: true,
    })).not.toThrow();

    expect(service.getSnapshot()).toEqual({
      seed: "safe-fallback",
      currentFloor: 1,
      highestClearedFloor: 0,
      checkpointFloor: 1,
      endlessUnlocked: false,
    });
  });
});
