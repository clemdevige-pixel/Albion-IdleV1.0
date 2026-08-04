import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@game/core";
import { RecipeRegistry } from "../recipes/recipe-registry.js";
import { asRecipeId } from "../recipes/recipe-types.js";
import type { RecipeDefinition } from "../recipes/recipe-types.js";
import { CraftStationRegistry } from "../craft-stations/craft-station-registry.js";
import { asCraftStationId } from "../craft-stations/craft-station-types.js";
import type { CraftStationDefinition } from "../craft-stations/craft-station-types.js";
import { CraftPipeline } from "../craft-execution/craft-pipeline.js";
import { InMemoryIngredientConsumer } from "../craft-execution/ingredient-consumer.js";
import { InMemoryOutputProducer } from "../craft-execution/output-producer.js";
import type { CraftExecutionEventMap } from "../craft-execution/craft-execution-events.js";
import { CraftingCoordinator } from "../crafting-integration/crafting-coordinator.js";
import type { CraftingIntegrationEventMap } from "../crafting-integration/crafting-integration-events.js";
import {
  serializeCraftingSaveState,
  deserializeCraftingSaveState,
} from "../crafting-integration/crafting-save-state.js";
import type { CraftingSaveState } from "../crafting-integration/crafting-save-state.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RECIPE_ID = asRecipeId("recipe:iron_sword");
const STATION_ID = asCraftStationId("station:forge");

function makeRecipe(overrides?: Partial<RecipeDefinition>): RecipeDefinition {
  return {
    id: RECIPE_ID,
    category: "crafting",
    tier: 3,
    requiredStation: STATION_ID,
    inputs: [{ itemDefId: "iron_bar", quantity: 2 }],
    outputs: [{ itemDefId: "iron_sword", quantity: 1 }],
    craftDurationTicks: 10,
    requiredMasteryLevel: 0,
    tags: [],
    ...overrides,
  };
}

function makeStation(): CraftStationDefinition {
  return {
    id: STATION_ID,
    displayName: "Forge",
    type: "crafting",
    supportedRecipeCategories: ["crafting"],
    tier: 3,
    tags: [],
  };
}

function setup(opts?: { withStation?: boolean; seedItems?: boolean }) {
  const recipeRegistry = new RecipeRegistry();
  recipeRegistry.register(makeRecipe());

  const stationRegistry = new CraftStationRegistry();
  if (opts?.withStation) {
    stationRegistry.register(makeStation());
  }

  const consumer = new InMemoryIngredientConsumer();
  if (opts?.seedItems !== false) {
    consumer.addItem("iron_bar", 20);
  }

  const producer = new InMemoryOutputProducer();

  const executionBus = new EventBus<CraftExecutionEventMap>();
  const integrationBus = new EventBus<CraftingIntegrationEventMap>();

  const pipeline = new CraftPipeline({
    recipeRegistry,
    stationRegistry: opts?.withStation ? stationRegistry : undefined,
    ingredientConsumer: consumer,
    outputProducer: producer,
    eventBus: executionBus,
  });

  const coordinator = new CraftingCoordinator({
    recipeRegistry,
    stationRegistry: opts?.withStation ? stationRegistry : undefined,
    pipeline,
    eventBus: integrationBus,
  });

  return { recipeRegistry, stationRegistry, consumer, producer, executionBus, integrationBus, pipeline, coordinator };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CraftingIntegration", () => {
  it("full craft cycle with station", () => {
    const { coordinator, consumer, producer } = setup({ withStation: true, seedItems: true });

    const result = coordinator.executeCraft({ recipeId: RECIPE_ID, stationId: STATION_ID, quantity: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recipeId).toBe(RECIPE_ID);
      expect(result.produced).toEqual([{ itemDefId: "iron_sword", quantity: 1 }]);
      expect(result.consumed).toEqual([{ itemDefId: "iron_bar", quantity: 2 }]);
    }
    expect(consumer.getQuantity("iron_bar")).toBe(18);
    expect(producer.getQuantity("iron_sword")).toBe(1);
  });

  it("craft without station (station optional)", () => {
    const recipe = makeRecipe({ requiredStation: "" });
    const recipeRegistry = new RecipeRegistry();
    recipeRegistry.register(recipe);

    const consumer = new InMemoryIngredientConsumer();
    consumer.addItem("iron_bar", 10);
    const producer = new InMemoryOutputProducer();
    const executionBus = new EventBus<CraftExecutionEventMap>();
    const integrationBus = new EventBus<CraftingIntegrationEventMap>();

    const pipeline = new CraftPipeline({
      recipeRegistry,
      ingredientConsumer: consumer,
      outputProducer: producer,
      eventBus: executionBus,
    });

    const coordinator = new CraftingCoordinator({
      recipeRegistry,
      pipeline,
      eventBus: integrationBus,
    });

    const result = coordinator.executeCraft({ recipeId: RECIPE_ID, quantity: 1 });
    expect(result.ok).toBe(true);
  });

  it("fails for missing recipe", () => {
    const { coordinator } = setup();
    const unknownId = asRecipeId("recipe:unknown");

    const result = coordinator.executeCraft({ recipeId: unknownId, quantity: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("not found");
    }
  });

  it("fails when ingredients are insufficient", () => {
    const { coordinator } = setup({ seedItems: false });

    // Consumer has 0 items seeded
    const result = coordinator.executeCraft({ recipeId: RECIPE_ID, quantity: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Not enough");
    }
  });

  it("rollback on output production failure", () => {
    const { coordinator, consumer, producer } = setup();
    producer.shouldFail = true;
    producer.failReason = "Inventory full";

    const result = coordinator.executeCraft({ recipeId: RECIPE_ID, quantity: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rolledBack).toBe(true);
      expect(result.reason).toBe("Inventory full");
    }
    // Ingredients should be restored after rollback
    expect(consumer.getQuantity("iron_bar")).toBe(20);
  });

  it("multiple sequential crafts", () => {
    const { coordinator, consumer, producer } = setup();

    for (let i = 0; i < 5; i++) {
      const result = coordinator.executeCraft({ recipeId: RECIPE_ID, quantity: 1 });
      expect(result.ok).toBe(true);
    }

    expect(consumer.getQuantity("iron_bar")).toBe(10); // 20 - 5*2
    expect(producer.getQuantity("iron_sword")).toBe(5);
  });

  it("emits integration events on success", () => {
    const { coordinator, integrationBus } = setup();
    const completed = vi.fn();
    integrationBus.subscribe("integration:craftCompleted", completed);

    coordinator.executeCraft({ recipeId: RECIPE_ID, quantity: 2 });

    expect(completed).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: RECIPE_ID,
        outputs: [{ itemDefId: "iron_sword", quantity: 2 }],
        consumed: [{ itemDefId: "iron_bar", quantity: 4 }],
      }),
    );
  });

  it("emits integration events on failure", () => {
    const { coordinator, integrationBus } = setup();
    const failed = vi.fn();
    integrationBus.subscribe("integration:craftFailed", failed);

    coordinator.executeCraft({ recipeId: asRecipeId("recipe:nope"), quantity: 1 });

    expect(failed).toHaveBeenCalledOnce();
    expect(failed).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ reason: expect.stringContaining("not found") }),
    );
  });

  it("propagates execution-level events through the pipeline", () => {
    const { coordinator, executionBus } = setup();
    const started = vi.fn();
    const completed = vi.fn();
    executionBus.subscribe("execution:started", started);
    executionBus.subscribe("execution:completed", completed);

    coordinator.executeCraft({ recipeId: RECIPE_ID, quantity: 1 });

    expect(started).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledOnce();
  });

  describe("CraftingSaveState", () => {
    it("serializes and deserializes", () => {
      const state: CraftingSaveState = {
        activeSessions: [
          {
            recipeId: RECIPE_ID,
            stationId: STATION_ID,
            quantity: 3,
            state: "consuming",
            startedAt: 12345,
          },
        ],
      };

      const json = serializeCraftingSaveState(state);
      const restored = deserializeCraftingSaveState(json);

      expect(restored).toEqual(state);
    });

    it("round-trips empty state", () => {
      const state: CraftingSaveState = { activeSessions: [] };
      const restored = deserializeCraftingSaveState(serializeCraftingSaveState(state));
      expect(restored).toEqual(state);
    });
  });
});
