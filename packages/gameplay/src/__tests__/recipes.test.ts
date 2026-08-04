import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game/core";
import { RecipeRegistry } from "../recipes/recipe-registry.js";
import { resolveRecipe } from "../recipes/recipe-resolver.js";
import { validateRecipeDefinition } from "../recipes/recipe-validator.js";
import { asRecipeId } from "../recipes/recipe-types.js";
import type { RecipeDefinition } from "../recipes/recipe-types.js";
import type { RecipeEventMap } from "../recipes/recipe-events.js";

// ── Test data ───────────────────────────────────────────────────────

function makeRecipe(overrides: Partial<RecipeDefinition> = {}): RecipeDefinition {
  return {
    id: asRecipeId("recipe_pine_plank"),
    category: "refining",
    tier: 3,
    requiredStation: "station_lumbermill",
    inputs: [{ itemDefId: "pine_log", quantity: 4 }],
    outputs: [{ itemDefId: "pine_plank", quantity: 1 }],
    craftDurationTicks: 5,
    requiredMasteryLevel: 0,
    tags: ["wood", "basic"],
    ...overrides,
  };
}

// ── Registry ────────────────────────────────────────────────────────

describe("RecipeRegistry", () => {
  it("registers and retrieves a recipe", () => {
    const registry = new RecipeRegistry();
    const recipe = makeRecipe();
    registry.register(recipe);

    expect(registry.has(recipe.id)).toBe(true);
    expect(registry.get(recipe.id)).toBe(recipe);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    const registry = new RecipeRegistry();
    registry.register(makeRecipe());
    expect(() => registry.register(makeRecipe())).toThrow("already registered");
  });

  it("returns undefined for unknown id", () => {
    const registry = new RecipeRegistry();
    expect(registry.get(asRecipeId("nope"))).toBeUndefined();
    expect(registry.has(asRecipeId("nope"))).toBe(false);
  });

  it("filters by category", () => {
    const registry = new RecipeRegistry();
    const refining = makeRecipe();
    const crafting = makeRecipe({
      id: asRecipeId("recipe_sword"),
      category: "crafting",
    });
    registry.register(refining);
    registry.register(crafting);

    expect(registry.getByCategory("refining")).toEqual([refining]);
    expect(registry.getByCategory("crafting")).toEqual([crafting]);
  });

  it("filters by station", () => {
    const registry = new RecipeRegistry();
    const r1 = makeRecipe();
    const r2 = makeRecipe({
      id: asRecipeId("recipe_iron_bar"),
      requiredStation: "station_smelter",
    });
    registry.register(r1);
    registry.register(r2);

    expect(registry.getByStation("station_lumbermill")).toEqual([r1]);
    expect(registry.getByStation("station_smelter")).toEqual([r2]);
    expect(registry.getByStation("station_unknown")).toEqual([]);
  });

  it("getAll returns all registered recipes", () => {
    const registry = new RecipeRegistry();
    const r1 = makeRecipe();
    const r2 = makeRecipe({ id: asRecipeId("recipe_other") });
    registry.register(r1);
    registry.register(r2);

    expect(registry.getAll()).toHaveLength(2);
  });

  it("clear removes all definitions", () => {
    const registry = new RecipeRegistry();
    registry.register(makeRecipe());
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

// ── Resolver ────────────────────────────────────────────────────────

describe("resolveRecipe", () => {
  it("resolves a registered recipe", () => {
    const registry = new RecipeRegistry();
    const recipe = makeRecipe();
    registry.register(recipe);

    const result = resolveRecipe(recipe.id, registry);
    expect(result).toEqual({ ok: true, recipe });
  });

  it("returns not-found for unregistered id", () => {
    const registry = new RecipeRegistry();
    const result = resolveRecipe(asRecipeId("nope"), registry);
    expect(result).toEqual({ ok: false, reason: 'Recipe "nope" not found' });
  });
});

// ── Validator ───────────────────────────────────────────────────────

describe("validateRecipeDefinition", () => {
  it("accepts a valid recipe", () => {
    expect(validateRecipeDefinition(makeRecipe())).toEqual({ valid: true });
  });

  it("rejects recipe with no inputs", () => {
    const result = validateRecipeDefinition(makeRecipe({ inputs: [] }));
    expect(result).toEqual({ valid: false, reason: "Recipe must have at least one input" });
  });

  it("rejects recipe with no outputs", () => {
    const result = validateRecipeDefinition(makeRecipe({ outputs: [] }));
    expect(result).toEqual({ valid: false, reason: "Recipe must have at least one output" });
  });

  it("rejects input with zero quantity", () => {
    const result = validateRecipeDefinition(
      makeRecipe({ inputs: [{ itemDefId: "x", quantity: 0 }] }),
    );
    expect(result).toEqual({
      valid: false,
      reason: 'Input "x" has invalid quantity: 0',
    });
  });

  it("rejects output with negative quantity", () => {
    const result = validateRecipeDefinition(
      makeRecipe({ outputs: [{ itemDefId: "y", quantity: -1 }] }),
    );
    expect(result).toEqual({
      valid: false,
      reason: 'Output "y" has invalid quantity: -1',
    });
  });

  it("rejects tier below 3", () => {
    const result = validateRecipeDefinition(makeRecipe({ tier: 2 }));
    expect(result).toEqual({ valid: false, reason: "Invalid tier: 2 (must be >= 3)" });
  });
});

// ── Events ──────────────────────────────────────────────────────────

describe("RecipeEventMap with EventBus", () => {
  it("publishes recipe:registered event", () => {
    const bus = new EventBus<RecipeEventMap>();
    const handler = vi.fn();
    bus.subscribe("recipe:registered", handler);

    const recipe = makeRecipe();
    bus.publish("recipe:registered", { recipe });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ recipe });
  });

  it("publishes recipe:resolved event", () => {
    const bus = new EventBus<RecipeEventMap>();
    const handler = vi.fn();
    bus.subscribe("recipe:resolved", handler);

    const recipe = makeRecipe();
    bus.publish("recipe:resolved", { recipe });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ recipe });
  });
});

// ── Tags / extensibility ────────────────────────────────────────────

describe("Recipe tags", () => {
  it("supports custom tags for filtering", () => {
    const registry = new RecipeRegistry();
    const r1 = makeRecipe({ tags: ["wood", "basic"] });
    const r2 = makeRecipe({
      id: asRecipeId("recipe_iron_bar"),
      tags: ["metal", "advanced"],
    });
    registry.register(r1);
    registry.register(r2);

    const woodRecipes = registry.getAll().filter((r) => r.tags.includes("wood"));
    expect(woodRecipes).toEqual([r1]);

    const advancedRecipes = registry.getAll().filter((r) => r.tags.includes("advanced"));
    expect(advancedRecipes).toEqual([r2]);
  });
});
