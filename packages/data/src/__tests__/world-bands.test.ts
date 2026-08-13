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
});
