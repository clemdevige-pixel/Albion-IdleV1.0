import { describe, expect, it } from "vitest";
import { WORLD_BANDS, WORLD_BESTIARY } from "./worldModels";

describe("world UI models", () => {
  it("exposes the five validated world bands without inventing availability", () => {
    expect(WORLD_BANDS.map((band) => band.label)).toEqual([
      "Bleue",
      "Jaune",
      "Orange",
      "Rouge",
      "Noire",
    ]);
    expect(WORLD_BANDS.filter((band) => band.isAvailable).map((band) => band.id)).toEqual([
      "blue",
      "yellow",
    ]);
  });

  it("builds the bestiary from the authoritative monster catalog", () => {
    expect(WORLD_BESTIARY.length).toBeGreaterThan(0);
    expect(new Set(WORLD_BESTIARY.map((entry) => entry.faction))).toEqual(
      new Set(["Keeper", "Morgana", "Heretic", "Undead"]),
    );
    expect(WORLD_BESTIARY.every((entry) => entry.imageSrc !== undefined)).toBe(true);
  });
});
