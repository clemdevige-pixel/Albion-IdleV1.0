import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager, RefiningManager } from "@game/gameplay";
import {
  RefiningRuntime,
  RefiningSaveProvider,
  type SavedRefiningPayloadV2,
} from "./RefiningRuntime.js";

function setupTestEnvironment(inventoryCapacity = 10) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventoryManager = new InventoryManager(world, () => undefined);
  inventoryManager.createInventory(heroId, inventoryCapacity);

  let productionTier: 3 | 4 = 3;
  const runtime = new RefiningRuntime({
    refiningManagers: {
      Wood: new RefiningManager(),
      Ore: new RefiningManager(),
      Hide: new RefiningManager(),
      Fiber: new RefiningManager(),
    },
    inventoryManager,
    heroId,
    getProductionTier: () => productionTier,
  });

  return {
    heroId,
    inventoryManager,
    runtime,
    setProductionTier: (tier: 3 | 4) => { productionTier = tier; },
  };
}

function addWood(env: ReturnType<typeof setupTestEnvironment>, quantity: number): void {
  env.inventoryManager.addQuantity(env.heroId, "item_resource_wood_t3", quantity, {
    itemId: "item_resource_wood_t3",
    stackable: true,
    maxStack: 999,
  });
}

describe("RefiningRuntime regression suite", () => {
  it("refunds reserved inputs and stops automation when output storage is full", () => {
    const env = setupTestEnvironment(2);
    addWood(env, 5);
    env.inventoryManager.addQuantity(env.heroId, "filler_item", 1, {
      itemId: "filler_item",
      stackable: false,
      maxStack: 1,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    for (let tick = 1; tick <= 6; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_resource_wood_t3")).toBe(5);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_refined_planks_t3")).toBe(0);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(false);
  });

  it("chains automatic refining while ingredients remain", () => {
    const env = setupTestEnvironment();
    addWood(env, 8);

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    for (let tick = 1; tick <= 12; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_refined_planks_t3")).toBe(2);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_resource_wood_t3")).toBe(0);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });

  it("rejects T4 refining when the predecessor refined component is missing", () => {
    const env = setupTestEnvironment();
    env.setProductionTier(4);
    env.inventoryManager.addQuantity(env.heroId, "item_resource_wood_t4", 2, {
      itemId: "item_resource_wood_t4",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("failed");
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });
});

describe("RefiningSaveProvider persistence", () => {
  it("saves a resumable V2 session without interrupting live refining", () => {
    const env = setupTestEnvironment();
    const provider = new RefiningSaveProvider(
      env.runtime,
      env.inventoryManager,
      () => env.heroId,
    );
    addWood(env, 4);

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    env.runtime.tick(2);

    const saved = provider.save() as SavedRefiningPayloadV2;
    expect(saved.version).toBe(2);
    expect(saved.sessions).toEqual([
      expect.objectContaining({
        family: "Wood",
        tier: 3,
        automatic: true,
        elapsedTicks: 2,
        reservedInputs: [{ itemId: "item_resource_wood_t3", quantity: 4 }],
      }),
    ]);
    expect(env.runtime.isRefiningActive("Wood")).toBe(true);
  });

  it("restores V2 progress without refunding reserved inputs or granting output early", () => {
    const source = setupTestEnvironment();
    const sourceProvider = new RefiningSaveProvider(
      source.runtime,
      source.inventoryManager,
      () => source.heroId,
    );
    addWood(source, 4);
    source.runtime.toggleRefiningFamily("Wood", 0);
    source.runtime.tick(2);
    const saved = sourceProvider.save();

    const restored = setupTestEnvironment();
    const restoredProvider = new RefiningSaveProvider(
      restored.runtime,
      restored.inventoryManager,
      () => restored.heroId,
    );
    restoredProvider.load(saved);

    expect(restored.inventoryManager.getTotalQuantity(restored.heroId, "item_resource_wood_t3")).toBe(0);
    expect(restored.inventoryManager.getTotalQuantity(restored.heroId, "item_refined_planks_t3")).toBe(0);
    expect(restored.runtime.isRefiningActive("Wood")).toBe(true);

    restored.runtime.tick(1);
    restored.runtime.tick(2);
    restored.runtime.tick(3);
    expect(restored.inventoryManager.getTotalQuantity(restored.heroId, "item_refined_planks_t3")).toBe(0);
    restored.runtime.tick(4);
    expect(restored.inventoryManager.getTotalQuantity(restored.heroId, "item_refined_planks_t3")).toBe(1);
  });

  it("keeps V1 recovery semantics by refunding legacy reserved inputs exactly once", () => {
    const env = setupTestEnvironment();
    const provider = new RefiningSaveProvider(
      env.runtime,
      env.inventoryManager,
      () => env.heroId,
    );

    provider.load({
      reservedInputs: [{ itemId: "item_resource_wood_t3", quantity: 4 }],
    });

    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_resource_wood_t3")).toBe(4);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.inventoryManager.getTotalQuantity(env.heroId, "item_refined_planks_t3")).toBe(0);
  });

  it("restores multiple V2 refining families independently", () => {
    const source = setupTestEnvironment();
    const sourceProvider = new RefiningSaveProvider(
      source.runtime,
      source.inventoryManager,
      () => source.heroId,
    );
    addWood(source, 4);
    source.inventoryManager.addQuantity(source.heroId, "item_resource_copper_ore_t3", 4, {
      itemId: "item_resource_copper_ore_t3",
      stackable: true,
      maxStack: 999,
    });
    source.runtime.toggleRefiningFamily("Wood", 0);
    source.runtime.toggleRefiningFamily("Ore", 0);
    source.runtime.tick(2);

    const restored = setupTestEnvironment();
    const restoredProvider = new RefiningSaveProvider(
      restored.runtime,
      restored.inventoryManager,
      () => restored.heroId,
    );
    restoredProvider.load(sourceProvider.save());

    expect(restored.runtime.isRefiningActive("Wood")).toBe(true);
    expect(restored.runtime.isRefiningActive("Ore")).toBe(true);
    expect(restored.runtime.getReservedInputs("Wood")).toEqual([
      { itemId: "item_resource_wood_t3", quantity: 4 },
    ]);
    expect(restored.runtime.getReservedInputs("Ore")).toEqual([
      { itemId: "item_resource_copper_ore_t3", quantity: 4 },
    ]);
  });
});

describe("RefiningRuntime production storage boundary", () => {
  it("consumes and produces resources outside the visible hero inventory", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const productionStorageId = world.createEntity();
    const inventoryManager = new InventoryManager(world, () => undefined);
    inventoryManager.createInventory(heroId, 1);
    inventoryManager.createInventory(productionStorageId, 16);

    const runtime = new RefiningRuntime({
      refiningManagers: {
        Wood: new RefiningManager(),
        Ore: new RefiningManager(),
        Hide: new RefiningManager(),
        Fiber: new RefiningManager(),
      },
      inventoryManager,
      productionStorageId,
      getProductionTier: () => 3,
    });
    inventoryManager.addQuantity(productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    for (let tick = 1; tick <= 6; tick += 1) runtime.tick(tick);

    expect(inventoryManager.getOccupiedCount(heroId)).toBe(0);
    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_resource_wood_t3")).toBe(0);
    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_refined_planks_t3")).toBe(1);
  });
});
