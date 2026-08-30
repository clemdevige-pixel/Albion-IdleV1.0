import { describe, expect, it } from "vitest";
import { TowerProgressionService } from "./tower-progression.js";

describe("TowerProgressionService", () => {
  it("starts at floor 1 with no Endless access", () => {
    expect(new TowerProgressionService("seed").getSnapshot()).toEqual({
      seed: "seed",
      currentFloor: 1,
      highestClearedFloor: 0,
      checkpointFloor: 1,
      endlessUnlocked: false,
    });
  });

  it("advances one floor at a time and only moves checkpoint at block end", () => {
    const service = new TowerProgressionService("seed");
    for (let floor = 1; floor <= 4; floor += 1) {
      expect(service.clearCurrentFloor(floor).checkpointAdvanced).toBe(false);
    }
    expect(service.getSnapshot()).toMatchObject({ currentFloor: 5, checkpointFloor: 1 });

    expect(service.clearCurrentFloor(5)).toMatchObject({
      nextFloor: 6,
      checkpointAdvanced: true,
      endlessUnlockedNow: false,
    });
    expect(service.getSnapshot()).toMatchObject({
      currentFloor: 6,
      highestClearedFloor: 5,
      checkpointFloor: 6,
    });
  });

  it("returns to the beginning of the current block after failure", () => {
    const service = new TowerProgressionService("seed");
    for (let floor = 1; floor <= 7; floor += 1) service.clearCurrentFloor(floor);
    expect(service.getSnapshot()).toMatchObject({ currentFloor: 8, checkpointFloor: 6 });
    expect(service.failCurrentFloor()).toBe(6);
    expect(service.getSnapshot()).toMatchObject({ currentFloor: 6, highestClearedFloor: 7, checkpointFloor: 6 });
  });

  it("unlocks Endless exactly when floor 25 is cleared", () => {
    const service = new TowerProgressionService("seed");
    for (let floor = 1; floor <= 24; floor += 1) service.clearCurrentFloor(floor);
    expect(service.getSnapshot().endlessUnlocked).toBe(false);

    expect(service.clearCurrentFloor(25)).toMatchObject({
      nextFloor: 26,
      checkpointAdvanced: true,
      endlessUnlockedNow: true,
    });
    expect(service.getSnapshot()).toMatchObject({
      currentFloor: 26,
      highestClearedFloor: 25,
      checkpointFloor: 26,
      endlessUnlocked: true,
    });
  });

  it("rejects out-of-order clears", () => {
    const service = new TowerProgressionService("seed");
    expect(() => service.clearCurrentFloor(2)).toThrow(/must match current floor/);
  });

  it("restores a valid mid-block checkpoint state", () => {
    const service = new TowerProgressionService("fresh");
    service.restore({
      seed: "persisted",
      currentFloor: 8,
      highestClearedFloor: 7,
      checkpointFloor: 6,
      endlessUnlocked: false,
    });
    expect(service.getSnapshot()).toEqual({
      seed: "persisted",
      currentFloor: 8,
      highestClearedFloor: 7,
      checkpointFloor: 6,
      endlessUnlocked: false,
    });
  });

  it("rejects corrupted persisted checkpoint and unlock combinations", () => {
    const service = new TowerProgressionService("seed");
    expect(() => service.restore({
      seed: "persisted",
      currentFloor: 8,
      highestClearedFloor: 7,
      checkpointFloor: 1,
      endlessUnlocked: false,
    })).toThrow(/checkpoint is inconsistent/);

    expect(() => service.restore({
      seed: "persisted",
      currentFloor: 26,
      highestClearedFloor: 25,
      checkpointFloor: 26,
      endlessUnlocked: false,
    })).toThrow(/Endless unlock state is inconsistent/);
  });
});
