import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@game/core";
import { RecipeRegistry } from "../recipes/recipe-registry.js";
import { CraftStationRegistry } from "../craft-stations/craft-station-registry.js";
import { asRecipeId } from "../recipes/recipe-types.js";
import { asCraftStationId } from "../craft-stations/craft-station-types.js";
import type { RecipeDefinition } from "../recipes/recipe-types.js";
import type { CraftStationDefinition } from "../craft-stations/craft-station-types.js";
import type { CraftExecutionEventMap } from "../craft-execution/craft-execution-events.js";
import type { CraftExecutionRequest } from "../craft-execution/craft-execution-types.js";
import { CraftValidator } from "../craft-execution/craft-validator.js";
import { InMemoryIngredientConsumer } from "../craft-execution/ingredient-consumer.js";
import { InMemoryOutputProducer } from "../craft-execution/output-producer.js";
import { CraftTransaction } from "../craft-execution/craft-transaction.js";
import { CraftPipeline } from "../craft-execution/craft-pipeline.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RECIPE_ID = asRecipeId("sword_t4");
const STATION_ID = asCraftStationId("warrior_forge");

function makeRecipe(overrides?: Partial<RecipeDefinition>): RecipeDefinition {
  return {
    id: RECIPE_ID,
    category: "crafting",
    tier: 4,
    requiredStation: "warrior_forge",
    inputs: [
      { itemDefId: "metal_bar", quantity: 3 },
      { itemDefId: "leather", quantity: 1 },
    ],
    outputs: [{ itemDefId: "sword_t4", quantity: 1 }],
    craftDurationTicks: 10,
    requiredMasteryLevel: 1,
    tags: ["weapon"],
    ...overrides,
  };
}

function makeStation(overrides?: Partial<CraftStationDefinition>): CraftStationDefinition {
  return {
    id: STATION_ID,
    displayName: "Warrior Forge",
    type: "crafting",
    supportedRecipeCategories: ["crafting"],
    tier: 4,
    tags: ["weapon"],
    ...overrides,
  };
}

function makeRequest(overrides?: Partial<CraftExecutionRequest>): CraftExecutionRequest {
  return {
    recipeId: RECIPE_ID,
    quantity: 1,
    ...overrides,
  };
}

function seedConsumer(consumer: InMemoryIngredientConsumer): void {
  consumer.addItem("metal_bar", 100);
  consumer.addItem("leather", 100);
}

// ---------------------------------------------------------------------------
// CraftValidator
// ---------------------------------------------------------------------------

describe("CraftValidator", () => {
  let validator: CraftValidator;
  let recipeRegistry: RecipeRegistry;
  let stationRegistry: CraftStationRegistry;

  beforeEach(() => {
    validator = new CraftValidator();
    recipeRegistry = new RecipeRegistry();
    stationRegistry = new CraftStationRegistry();
    recipeRegistry.register(makeRecipe());
    stationRegistry.register(makeStation());
  });

  it("accepts a valid craft request", () => {
    const result = validator.validateCraft(makeRequest(), recipeRegistry, stationRegistry);
    expect(result.ok).toBe(true);
  });

  it("rejects when recipe is missing", () => {
    const result = validator.validateCraft(
      makeRequest({ recipeId: asRecipeId("nonexistent") }),
      recipeRegistry,
      stationRegistry,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("not found");
  });

  it("rejects when station does not support recipe category", () => {
    stationRegistry.clear();
    stationRegistry.register(
      makeStation({ supportedRecipeCategories: ["refining"] }),
    );
    const result = validator.validateCraft(
      makeRequest({ stationId: STATION_ID }),
      recipeRegistry,
      stationRegistry,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("does not support");
  });

  it("accepts request without stationId (no station check)", () => {
    const result = validator.validateCraft(makeRequest(), recipeRegistry);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// InMemoryIngredientConsumer
// ---------------------------------------------------------------------------

describe("InMemoryIngredientConsumer", () => {
  let consumer: InMemoryIngredientConsumer;
  const ingredients = makeRecipe().inputs;

  beforeEach(() => {
    consumer = new InMemoryIngredientConsumer();
  });

  it("consumes ingredients successfully", () => {
    seedConsumer(consumer);
    const result = consumer.consume(ingredients, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.consumed).toHaveLength(2);
      expect(result.consumed[0]!.quantity).toBe(6); // 3 * 2
    }
    expect(consumer.getQuantity("metal_bar")).toBe(94);
  });

  it("fails when ingredients are insufficient", () => {
    consumer.addItem("metal_bar", 1);
    const result = consumer.consume(ingredients, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Not enough");
  });

  it("rollback restores consumed items", () => {
    seedConsumer(consumer);
    const result = consumer.consume(ingredients, 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      consumer.rollback(result.consumed);
    }
    expect(consumer.getQuantity("metal_bar")).toBe(100);
    expect(consumer.getQuantity("leather")).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// InMemoryOutputProducer
// ---------------------------------------------------------------------------

describe("InMemoryOutputProducer", () => {
  it("produces outputs successfully", () => {
    const producer = new InMemoryOutputProducer();
    const outputs = makeRecipe().outputs;
    const result = producer.produce(outputs, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.produced[0]!.quantity).toBe(3);
    }
    expect(producer.getQuantity("sword_t4")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// CraftTransaction
// ---------------------------------------------------------------------------

describe("CraftTransaction", () => {
  let consumer: InMemoryIngredientConsumer;
  let producer: InMemoryOutputProducer;
  const recipe = makeRecipe();

  beforeEach(() => {
    consumer = new InMemoryIngredientConsumer();
    producer = new InMemoryOutputProducer();
    seedConsumer(consumer);
  });

  it("completes a full transaction", () => {
    const tx = new CraftTransaction();
    const result = tx.execute(recipe.inputs, recipe.outputs, 1, consumer, producer);
    expect(result.ok).toBe(true);
    expect(tx.state).toBe("completed");
    expect(consumer.getQuantity("metal_bar")).toBe(97);
    expect(producer.getQuantity("sword_t4")).toBe(1);
  });

  it("rolls back on produce failure", () => {
    producer.shouldFail = true;
    const tx = new CraftTransaction();
    const result = tx.execute(recipe.inputs, recipe.outputs, 1, consumer, producer);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rolledBack).toBe(true);
    expect(tx.state).toBe("rolledBack");
    // Items restored
    expect(consumer.getQuantity("metal_bar")).toBe(100);
    expect(consumer.getQuantity("leather")).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// CraftPipeline
// ---------------------------------------------------------------------------

describe("CraftPipeline", () => {
  let recipeRegistry: RecipeRegistry;
  let stationRegistry: CraftStationRegistry;
  let consumer: InMemoryIngredientConsumer;
  let producer: InMemoryOutputProducer;
  let eventBus: EventBus<CraftExecutionEventMap>;
  let pipeline: CraftPipeline;

  beforeEach(() => {
    recipeRegistry = new RecipeRegistry();
    stationRegistry = new CraftStationRegistry();
    recipeRegistry.register(makeRecipe());
    stationRegistry.register(makeStation());
    consumer = new InMemoryIngredientConsumer();
    producer = new InMemoryOutputProducer();
    seedConsumer(consumer);
    eventBus = new EventBus<CraftExecutionEventMap>();
    pipeline = new CraftPipeline({
      recipeRegistry,
      stationRegistry,
      ingredientConsumer: consumer,
      outputProducer: producer,
      eventBus,
    });
  });

  it("executes end-to-end successfully", () => {
    const result = pipeline.execute(makeRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.produced).toHaveLength(1);
      expect(result.produced[0]!.itemDefId).toBe("sword_t4");
      expect(result.consumed).toHaveLength(2);
    }
  });

  it("fails on validation error", () => {
    const result = pipeline.execute(
      makeRequest({ recipeId: asRecipeId("nope") }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("not found");
      expect(result.rolledBack).toBe(false);
    }
  });

  it("rolls back on consume failure", () => {
    consumer = new InMemoryIngredientConsumer(); // empty
    pipeline = new CraftPipeline({
      recipeRegistry,
      stationRegistry,
      ingredientConsumer: consumer,
      outputProducer: producer,
      eventBus,
    });
    const result = pipeline.execute(makeRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Not enough");
  });

  it("rolls back on produce failure", () => {
    producer.shouldFail = true;
    const result = pipeline.execute(makeRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rolledBack).toBe(true);
    // Ingredients restored
    expect(consumer.getQuantity("metal_bar")).toBe(100);
  });

  it("produces deterministic results", () => {
    const r1 = pipeline.execute(makeRequest());
    // Reset
    seedConsumer(consumer);
    const r2 = pipeline.execute(makeRequest());
    expect(r1).toEqual(r2);
  });

  it("fires all expected events on success", () => {
    const events: string[] = [];
    eventBus.subscribe("execution:started", () => events.push("started"));
    eventBus.subscribe("execution:validated", () => events.push("validated"));
    eventBus.subscribe("execution:consumed", () => events.push("consumed"));
    eventBus.subscribe("execution:produced", () => events.push("produced"));
    eventBus.subscribe("execution:completed", () => events.push("completed"));
    eventBus.subscribe("execution:failed", () => events.push("failed"));
    eventBus.subscribe("execution:rolledBack", () => events.push("rolledBack"));

    pipeline.execute(makeRequest());
    expect(events).toEqual(["started", "validated", "consumed", "produced", "completed"]);
  });

  it("fires rolledBack and failed events on produce failure", () => {
    const events: string[] = [];
    eventBus.subscribe("execution:started", () => events.push("started"));
    eventBus.subscribe("execution:validated", () => events.push("validated"));
    eventBus.subscribe("execution:failed", () => events.push("failed"));
    eventBus.subscribe("execution:rolledBack", () => events.push("rolledBack"));

    producer.shouldFail = true;
    pipeline.execute(makeRequest());
    expect(events).toEqual(["started", "validated", "rolledBack", "failed"]);
  });
});
