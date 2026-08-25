import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { InventoryManager, RefiningManager } from "@game/gameplay";
import { RefiningRuntime, RefiningSaveProvider } from "./RefiningRuntime.js";

function createRefiningEnvironment() {
  const world = new World(createRuntimeServices());
  const storageId = world.createEntity();
  const inventoryManager = new InventoryManager(world, () => undefined);
  inventoryManager.createInventory(storageId, 32);

  const runtime = new RefiningRuntime({
    refiningManagers: {
      Wood: new RefiningManager(),
      Ore: new RefiningManager(),
      Hide: new RefiningManager(),
      Fiber: new RefiningManager(),
    },
    inventoryManager,
    productionStorageId: storageId,
    getProductionTier: () => 3,
  });

  return { runtime, inventoryManager, storageId };
}

describe("RefiningRuntime background progression", () => {
  it("consumes multiple automatic cycles at completion boundaries", () => {
    const env = createRefiningEnvironment();
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t3", 12, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    env.runtime.resolveBackground(18 * 500, 500);

    expect(
      env.inventoryManager.getTotalQuantity(
        env.storageId,
        "item_refined_planks_t3",
      ),
    ).toBe(3);
    expect(
      env.inventoryManager.getTotalQuantity(
        env.storageId,
        "item_resource_wood_t3",
      ),
    ).toBe(0);
    expect(env.runtime.isRefiningActive("Wood")).toBe(false);
  });

  it("exposes the same resolution through the registered save provider contract", () => {
    const env = createRefiningEnvironment();
    const provider = new RefiningSaveProvider(
      env.runtime,
      env.inventoryManager,
      () => env.storageId,
    );
    env.inventoryManager.addQuantity(env.storageId, "item_resource_wood_t3", 4, {
      itemId: "item_resource_wood_t3",
      stackable: true,
      maxStack: 999,
    });

    expect(env.runtime.toggleRefiningFamily("Wood", 0).action).toBe("started");
    provider.resolveBackground?.(6 * 500);

    expect(
      env.inventoryManager.getTotalQuantity(
        env.storageId,
        "item_refined_planks_t3",
      ),
    ).toBe(1);
  });
});
