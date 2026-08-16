import { describe, expect, it } from "vitest";
import {
  WORLD_BAND_DEFINITIONS,
  WORLD_BAND_IDS,
  getWorldBandDefinition,
} from "../config/world-bands.js";

describe("world band definitions", () => {
  it("keeps the implemented Blue world as the T3 to T4 band", () => {
    expect(getWorldBandDefinition("blue")).toEqual({
      id: "blue",
      label: "Bleue",
      progressionOrder: 0,
      minimumTier: 3,
      maximumTier: 4,
      contentStatus: "implemented",
    });
  });

  it("marks Blue and Yellow implemented while reserving later worlds", () => {
    expect(WORLD_BAND_DEFINITIONS.map(({ id }) => id)).toEqual(WORLD_BAND_IDS);
    expect(getWorldBandDefinition("yellow").contentStatus).toBe("implemented");
    expect(WORLD_BAND_DEFINITIONS.slice(2).every(
      ({ contentStatus }) => contentStatus === "planned",
    )).toBe(true);
  });

  it("routes the planned endgame bands directly to T6, T7 and T8", () => {
    expect(getWorldBandDefinition("orange")).toMatchObject({
      progressionOrder: 2,
      minimumTier: 6,
      maximumTier: 6,
      contentStatus: "planned",
    });
    expect(getWorldBandDefinition("red")).toMatchObject({
      progressionOrder: 3,
      minimumTier: 7,
      maximumTier: 7,
      contentStatus: "planned",
    });
    expect(getWorldBandDefinition("black")).toMatchObject({
      progressionOrder: 4,
      minimumTier: 8,
      maximumTier: 8,
      contentStatus: "planned",
    });
  });
});
