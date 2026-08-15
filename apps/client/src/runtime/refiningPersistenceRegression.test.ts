import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager, RefiningManager } from "@game/gameplay";
import { RefiningRuntime, RefiningSaveProvider } from "./RefiningRuntime.js";

function setup() {
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
  const provider = new RefiningSaveProvider(runtime, inventoryManager, () => productionStorageId);
  return { productionStorageId, inventoryManager, runtime, provider };
}

describe("Refining persistence in-place load regression", () => {
  it("discards the pre-load live session and restores reserved inputs without later output duplication", () => {
    const env = setup();
    env.inventoryManager.addQuantity(env.productionStorageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    const saveData = env.provider.save();
    expect(env.runtime.isRefiningActive("Wood")).toBe(true);
    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_resource_wood_t3")).toBe(0);

    // Persistence restores the inventory snapshot before providers. The saved
    // snapshot contains no reserved inputs, so emulate that authoritative state.
    env.provider.load(saveData);

    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_resource_wood_t3")).toBe(4);

    for (let tick = 1; tick <= 20; tick += 1) env.runtime.tick(tick);

    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_refined_planks_t3")).toBe(0);
    expect(env.inventoryManager.getTotalQuantity(env.productionStorageId, "item_resource_wood_t3")).toBe(4);
  });
});
