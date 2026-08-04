import { describe, it, expect, beforeEach } from "vitest";
import { CraftStationRegistry } from "../craft-stations/craft-station-registry.js";
import { resolveCraftStation } from "../craft-stations/craft-station-resolver.js";
import { validateStationDefinition } from "../craft-stations/craft-station-validator.js";
import {
  asCraftStationId,
  type CraftStationDefinition,
} from "../craft-stations/craft-station-types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStation(
  overrides?: Partial<CraftStationDefinition>,
): CraftStationDefinition {
  return {
    id: asCraftStationId("station-smelter-t4"),
    displayName: "T4 Smelter",
    type: "refining",
    supportedRecipeCategories: ["refining"],
    tier: 4,
    tags: ["smelting"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CraftStationRegistry
// ---------------------------------------------------------------------------

describe("CraftStationRegistry", () => {
  let registry: CraftStationRegistry;

  beforeEach(() => {
    registry = new CraftStationRegistry();
  });

  it("registers and retrieves a station", () => {
    const def = makeStation();
    registry.register(def);
    expect(registry.get(def.id)).toBe(def);
    expect(registry.has(def.id)).toBe(true);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    const def = makeStation();
    registry.register(def);
    expect(() => registry.register(def)).toThrow("already registered");
  });

  it("returns undefined for unknown id", () => {
    expect(registry.get(asCraftStationId("nope"))).toBeUndefined();
    expect(registry.has(asCraftStationId("nope"))).toBe(false);
  });

  it("filters by type", () => {
    registry.register(makeStation());
    registry.register(
      makeStation({
        id: asCraftStationId("station-forge-t4"),
        displayName: "T4 Forge",
        type: "crafting",
        supportedRecipeCategories: ["crafting"],
      }),
    );
    expect(registry.getByType("refining")).toHaveLength(1);
    expect(registry.getByType("crafting")).toHaveLength(1);
    expect(registry.getByType("both")).toHaveLength(0);
  });

  it("getAll returns all stations", () => {
    registry.register(makeStation());
    registry.register(
      makeStation({
        id: asCraftStationId("station-forge-t4"),
        displayName: "T4 Forge",
        type: "crafting",
        supportedRecipeCategories: ["crafting"],
      }),
    );
    expect(registry.getAll()).toHaveLength(2);
  });

  it("clear removes all stations", () => {
    registry.register(makeStation());
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validateStationDefinition
// ---------------------------------------------------------------------------

describe("validateStationDefinition", () => {
  it("accepts a valid definition", () => {
    const result = validateStationDefinition(makeStation());
    expect(result.valid).toBe(true);
  });

  it("rejects missing id", () => {
    const result = validateStationDefinition(
      makeStation({ id: asCraftStationId("") }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("id");
  });

  it("rejects missing displayName", () => {
    const result = validateStationDefinition(
      makeStation({ displayName: "" }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("displayName");
  });

  it("rejects invalid type", () => {
    const result = validateStationDefinition(
      makeStation({ type: "invalid" as never }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("type");
  });

  it("rejects tier < 3", () => {
    const result = validateStationDefinition(makeStation({ tier: 2 }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("tier");
  });

  it("rejects empty supportedRecipeCategories", () => {
    const result = validateStationDefinition(
      makeStation({ supportedRecipeCategories: [] }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("category");
  });
});

// ---------------------------------------------------------------------------
// resolveCraftStation
// ---------------------------------------------------------------------------

describe("resolveCraftStation", () => {
  let registry: CraftStationRegistry;

  beforeEach(() => {
    registry = new CraftStationRegistry();
  });

  it("resolves a registered station", () => {
    const def = makeStation();
    registry.register(def);
    const result = resolveCraftStation(def.id, registry);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.station).toBe(def);
  });

  it("returns not-found for unknown id", () => {
    const result = resolveCraftStation(asCraftStationId("nope"), registry);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("not found");
  });
});
