import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager, RefiningManager } from "@game/gameplay";
import { RefiningRuntime } from "./RefiningRuntime.js";

function createRuntime() {
  const world = new World(createRuntimeServices());
  const productionStorageId = world.createEntity();
  const inventoryManager = new InventoryManager(world, () => undefined);
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

  return { inventoryManager, productionStorageId, runtime };
}

describe("RefiningRuntime automatic feed regression", () => {
  it("stays armed after temporary input exhaustion and restarts when storage is replenished", () => {
    const env = createRuntime();

    env.inventoryManager.addQuantity(env.productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(true);

    for (let tick = 1; tick <= 6; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_planks_t3")).toBe(1);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(true);

    env.inventoryManager.addQuantity(env.productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    env.runtime.tick(7);
    expect(env.runtime.isRefiningActive("Wood")).toBe(true);

    for (let tick = 8; tick <= 13; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_planks_t3")).toBe(2);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(true);

    expect(env.runtime.toggleRefiningFamily("Wood", 14).action).toBe("stopped");
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(false);
  });

  it("keeps simultaneous refining families isolated while one waits for replenishment", () => {
    const env = createRuntime();

    env.inventoryManager.addQuantity(env.productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });
    env.inventoryManager.addQuantity(env.productionStorageId, "item_resource_copper_ore_t3", 8, {
      itemId: "item_resource_copper_ore_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    expect(env.runtime.toggleRefiningFamily("Ore", 0).action).toBe("started");

    for (let tick = 1; tick <= 6; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_planks_t3")).toBe(1);
    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_bar_t3")).toBe(1);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(true);
    expect(env.runtime.isRefiningActive("Ore")).toBe(true);

    env.inventoryManager.addQuantity(env.productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    env.runtime.tick(7);
    expect(env.runtime.isRefiningActive("Wood")).toBe(true);
    expect(env.runtime.isRefiningActive("Ore")).toBe(true);

    for (let tick = 8; tick <= 13; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_planks_t3")).toBe(2);
    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_bar_t3")).toBe(2);
    expect(env.runtime.isAutomaticEnabled("Wood")).toBe(true);
    expect(env.runtime.isAutomaticEnabled("Ore")).toBe(true);
  });
});
