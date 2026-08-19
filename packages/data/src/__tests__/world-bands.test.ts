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

  it("marks every authored world band as implemented", () => {
    expect(WORLD_BAND_DEFINITIONS.map(({ id }) => id)).toEqual(WORLD_BAND_IDS);
    expect(WORLD_BAND_DEFINITIONS.every(
      ({ contentStatus }) => contentStatus === "implemented",
    )).toBe(true);
  });

  it("routes the progression bands directly to T6, T7 and T8", () => {
    expect(getWorldBandDefinition("orange")).toMatchObject({
      progressionOrder: 2,
      minimumTier: 6,
      maximumTier: 6,
      contentStatus: "implemented",
    });
    expect(getWorldBandDefinition("red")).toMatchObject({
      progressionOrder: 3,
      minimumTier: 7,
      maximumTier: 7,
      contentStatus: "implemented",
    });
    expect(getWorldBandDefinition("black")).toMatchObject({
      progressionOrder: 4,
      minimumTier: 8,
      maximumTier: 8,
      contentStatus: "implemented",
    });
  });
});
