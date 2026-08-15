import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager, RefiningManager } from "@game/gameplay";
import { RefiningRuntime } from "./RefiningRuntime.js";

describe("RefiningRuntime automatic feed regression", () => {
  it("stays armed after temporary input exhaustion and restarts when storage is replenished", () => {
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

    inventoryManager.addQuantity(productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    expect(runtime.isAutomaticEnabled("Wood")).toBe(true);

    for (let tick = 1; tick <= 6; tick += 1) runtime.tick(tick);

    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_refined_planks_t3")).toBe(1);
    expect(runtime.isRefiningActive("Wood")).toBe(false);
    expect(runtime.isAutomaticEnabled("Wood")).toBe(true);

    // Simulates a worker or active gather cycle replenishing the shared storage
    // after the refiner has already exhausted its previous inputs.
    inventoryManager.addQuantity(productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    runtime.tick(7);
    expect(runtime.isRefiningActive("Wood")).toBe(true);

    for (let tick = 8; tick <= 13; tick += 1) runtime.tick(tick);

    expect(inventoryManager.getTotalQuantity(productionStorageId, "item_refined_planks_t3")).toBe(2);
    expect(runtime.isRefiningActive("Wood")).toBe(false);
    expect(runtime.isAutomaticEnabled("Wood")).toBe(true);

    expect(runtime.toggleRefiningFamily("Wood", 14).action).toBe("stopped");
    expect(runtime.isAutomaticEnabled("Wood")).toBe(false);
  });
});
